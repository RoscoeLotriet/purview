import { afterEach, expect, it } from 'vitest';
import { startHarness, type PurviewHarness } from './harness/purview.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

let harness: PurviewHarness | undefined;

afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

/**
 * Every tool result is `jsonResult(...)`: one text block holding JSON. Parsing
 * it here keeps the test on the wire surface — the harness may construct the
 * system, but a test body drives it only through /mcp.
 */
function toolJson(result: unknown): Record<string, unknown> {
  const { content, isError } = result as {
    content?: Array<{ text?: string }>;
    isError?: boolean;
  };
  const text = content?.[0]?.text;
  if (isError) throw new Error(`tool call failed: ${text ?? 'no detail'}`);
  if (!text) throw new Error('tool result carried no text content');
  return JSON.parse(text) as Record<string, unknown>;
}

async function call(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return toolJson(await client.callTool({ name, arguments: args }));
}

/** Read a resource by URI and parse its single text content block. */
async function readJson(client: Client, uri: string): Promise<Record<string, unknown>> {
  const read = await client.readResource({ uri });
  const [entry] = read.contents;
  if (!entry || !('text' in entry)) throw new Error(`resource ${uri} returned no text content`);
  return JSON.parse(String(entry.text)) as Record<string, unknown>;
}

function ids(value: unknown): string[] {
  return (value as Array<{ id: string }>).map((i) => i.id);
}

/**
 * `depth` and `attention_only` are always spelled out, even where the test does
 * not care about them.
 *
 * Measured, not assumed: `workitem://{id}/tree{?depth,attention_only}` is a
 * form-style query expansion, and the SDK's matcher rejects the URI unless
 * *both* variables are present — `workitem://<id>/tree` and
 * `workitem://<id>/tree?depth=1` both come back as "Resource not found". An
 * agent reading the tree must therefore supply both. That is a sharp edge worth
 * knowing about; pinning it is not this slice's job, so these tests state the
 * URI in the form that works rather than asserting the edge.
 */
function treeUri(id: string, depth: number, attentionOnly: boolean): string {
  return `workitem://${id}/tree?depth=${depth}&attention_only=${attentionOnly}`;
}

it('serves all four resources by URI over the real transport', async () => {
  harness = await startHarness();
  const agent = await harness.mcp('scout');

  const root = await call(agent, 'work_create', {
    intent: 'ship the 0.2 release',
    idempotency_key: 'fq9-resources-root',
  });
  const rootId = root.id as string;
  const child = await call(agent, 'work_create', {
    parent_id: rootId,
    intent: 'run the smoke suite',
    idempotency_key: 'fq9-resources-child',
  });
  await call(agent, 'work_claim', { work_item_id: rootId, confidence: 0.6 });
  // Gives the provenance resource something to return: it reports transcript
  // entries that carry a context_digest, and nothing else.
  await call(agent, 'work_report', {
    work_item_id: rootId,
    kind: 'note',
    body: 'read the release checklist before deciding',
    context_digest: 'sha256:checklist',
  });

  // 1/4 — the bare item template. Registered with `{ list: undefined }`, so
  // resources/list does not enumerate it; every read here is by URI.
  const bare = await readJson(agent, `workitem://${rootId}`);
  const item = bare.item as Record<string, unknown>;
  expect(item.id).toBe(rootId);
  expect(bare.transcript).toEqual(expect.any(Array));

  // The owner principal id is only reachable this way — it is minted server-side
  // from the x-purview-principal header, never sent by the client.
  const ownerId = item.owner_id as string;
  expect(ownerId).toEqual(expect.stringMatching(/^pr_/));

  // 2/4 — the tree.
  const tree = await readJson(agent, treeUri(rootId, 5, false));
  expect(ids(tree.items)).toEqual([rootId, child.id]);

  // 3/4 — provenance.
  const provenance = await readJson(agent, `workitem://${rootId}/provenance`);
  expect(provenance.digests).toEqual([
    expect.objectContaining({ context_digest: 'sha256:checklist' }),
  ]);

  // 4/4 — the principal queue, on the other URI scheme.
  const queue = await readJson(agent, `principal://${ownerId}/queue`);
  expect(ids(queue.items)).toEqual([rootId]);
  expect(queue.escalations).toEqual([]);
});

it('resolves workitem://{id}/tree to the tree resource, not the bare item template', async () => {
  harness = await startHarness();
  const agent = await harness.mcp('scout');

  const root = await call(agent, 'work_create', {
    intent: 'ship the 0.2 release',
    idempotency_key: 'fq9-ordering-root',
  });
  const rootId = root.id as string;

  // The two resources are told apart by shape alone: the tree returns
  // `{ items, escalations }`, the bare item template returns
  // `{ item, transcript }`. If the tree URI were ever swallowed by the bare
  // template, the read would still succeed and an altitude query would quietly
  // return one item and a transcript instead of a subtree.
  const tree = await readJson(agent, treeUri(rootId, 0, false));
  expect(Object.keys(tree).sort()).toEqual(['escalations', 'items']);
  expect(tree).not.toHaveProperty('transcript');
  expect(ids(tree.items)).toEqual([rootId]);

  // And the registration order itself, which src/mcp/server.ts asserts only in
  // prose ("More specific templates are registered before the bare item
  // template"). resources/templates/list enumerates templates in registration
  // order, so this is that comment made executable: it fails if anyone moves
  // the bare template ahead of the specific ones.
  //
  // Measured caveat, so nobody over-reads this test: with the SDK version in
  // this lockfile the order is belt-and-braces. `{id}` does not match across a
  // `/`, so the bare template cannot swallow `workitem://<id>/tree` however it
  // is ordered — reordering the registrations by hand leaves the read above
  // passing. The order assertion guards the stated invariant against a future
  // matcher that is more permissive; the shape assertion above is what proves
  // today's read is the right one.
  const templates = (await agent.listResourceTemplates()).resourceTemplates.map(
    (t) => t.uriTemplate,
  );
  const bareIndex = templates.indexOf('workitem://{id}');
  expect(bareIndex).toBeGreaterThanOrEqual(0);
  expect(bareIndex).toBeGreaterThan(
    templates.indexOf('workitem://{id}/tree{?depth,attention_only}'),
  );
  expect(bareIndex).toBeGreaterThan(templates.indexOf('workitem://{id}/provenance'));
});

it('honours depth and attention_only from the tree URI query', async () => {
  harness = await startHarness();
  const agent = await harness.mcp('scout');

  const root = await call(agent, 'work_create', {
    intent: 'ship the 0.2 release',
    idempotency_key: 'fq9-altitude-root',
  });
  const rootId = root.id as string;
  const child = await call(agent, 'work_create', {
    parent_id: rootId,
    intent: 'run the smoke suite',
    idempotency_key: 'fq9-altitude-child',
  });
  const childId = child.id as string;
  const grandchild = await call(agent, 'work_create', {
    parent_id: childId,
    intent: 'wait for a staging slot',
    idempotency_key: 'fq9-altitude-grandchild',
  });

  const at = async (depth: number, attentionOnly: boolean): Promise<string[]> =>
    ids((await readJson(agent, treeUri(rootId, depth, attentionOnly))).items);

  // Three generations, read at three altitudes. `depth` is the whole point of
  // the product's read side: a tree that ignores it returns everything.
  expect(await at(0, false)).toEqual([rootId]);
  expect(await at(1, false)).toEqual([rootId, childId]);
  expect(await at(2, false)).toEqual([rootId, childId, grandchild.id]);

  // Nothing needs attention yet, so attention_only collapses the tree to the
  // item that was asked for — which the query always returns, as its anchor.
  expect(await at(2, true)).toEqual([rootId]);

  // Block one branch. `ready -> blocked` is not a legal transition, so the
  // child is claimed first; blocking requires a reason.
  await call(agent, 'work_claim', { work_item_id: childId, confidence: 0.4 });
  await call(agent, 'work_set_state', {
    work_item_id: childId,
    state: 'blocked',
    state_reason: 'no staging slot until the morning',
  });

  // The blocked child surfaces; the healthy grandchild under it collapses out
  // of view. A tree that returned the grandchild here would be the failure the
  // whole read side exists to prevent.
  expect(await at(2, true)).toEqual([rootId, childId]);
  expect(await at(2, true)).not.toContain(grandchild.id);
});
