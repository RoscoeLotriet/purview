/**
 * Scope note, required by the gate 2 review and repeated here because this is
 * where it will be read:
 *
 * Node is single-threaded. These tests prove safety across `await`
 * interleaving — several agents' requests overlapping on one event loop, each
 * POST building its own protocol server against one shared PurviewService,
 * which is the normal deployment condition (src/http/app.ts). They do **not**
 * prove thread safety, and they do **not** prove multi-process safety. Nothing
 * here says anything about two Purview processes sharing a store, because v0
 * has no shared store to contend over. Do not cite this file as evidence of
 * either.
 */
import { afterEach, expect, it } from 'vitest';
import { DEFAULT_HUMAN, DEFAULT_SIGNING_SECRET, startHarness } from './harness/purview.js';
import type { PurviewHarness } from './harness/purview.js';
import { actionIdForOption, blockActionsForm } from './harness/sign.js';
import { startSlackFake, type SlackFake } from './harness/slack-fake.js';
import { tap } from './harness/tap.js';
import { stillPending } from './harness/wait.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

let harness: PurviewHarness | undefined;
let slack: SlackFake | undefined;

afterEach(async () => {
  await harness?.close();
  harness = undefined;
  // Whoever starts the fake closes it; `harness.close()` deliberately does not.
  await slack?.close();
  slack = undefined;
});

/** The text of a tool result, error or not. Racing calls need both halves. */
function resultText(result: unknown): string {
  return (result as { content?: Array<{ text?: string }> }).content?.[0]?.text ?? '';
}

function failed(result: unknown): boolean {
  return (result as { isError?: boolean }).isError === true;
}

function toolJson(result: unknown): Record<string, unknown> {
  if (failed(result)) throw new Error(`tool call failed: ${resultText(result) || 'no detail'}`);
  const text = resultText(result);
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

async function readJson(client: Client, uri: string): Promise<Record<string, unknown>> {
  const read = await client.readResource({ uri });
  const [entry] = read.contents;
  if (!entry || !('text' in entry)) throw new Error(`resource ${uri} returned no text content`);
  return JSON.parse(String(entry.text)) as Record<string, unknown>;
}

type Entry = Record<string, unknown>;

it('lets exactly one of two racing agents claim an item', async () => {
  harness = await startHarness();
  const [alpha, bravo] = await Promise.all([harness.mcp('alpha'), harness.mcp('bravo')]);

  const item = await call(alpha, 'work_create', {
    intent: 'deploy the migration',
    idempotency_key: 'fq9-claim-race',
  });
  const itemId = item.id as string;

  // Both requests are in flight before either is handled. `callTool` rather
  // than `call`: the loser comes back as an isError result, which is the
  // surface an agent branches on, and throwing here would hide it.
  const results = await Promise.all([
    alpha.callTool({ name: 'work_claim', arguments: { work_item_id: itemId, confidence: 0.9 } }),
    bravo.callTool({ name: 'work_claim', arguments: { work_item_id: itemId, confidence: 0.9 } }),
  ]);

  const won = results.filter((r) => !failed(r));
  const lost = results.filter((r) => failed(r));
  expect(won).toHaveLength(1);
  expect(lost).toHaveLength(1);
  // The loser is told why, in terms it can act on — not a protocol failure.
  expect(resultText(lost[0])).toMatch(/cannot claim .*: state is running/);

  const winnerOwner = (toolJson(won[0]) as { owner_id?: string }).owner_id;
  const stored = await readJson(alpha, `workitem://${itemId}`);
  const item2 = stored.item as Record<string, unknown>;
  expect(item2.state).toBe('running');
  expect(item2.owner_id).toBe(winnerOwner);

  // One claim, one transcript entry. A second claim that had been accepted and
  // then overwritten would leave the item looking correct but the record wrong.
  const claims = (stored.transcript as Entry[]).filter(
    (e) => e.kind === 'state_change' && String(e.body).startsWith('claimed by'),
  );
  expect(claims).toHaveLength(1);
  expect(claims[0]?.author_id).toBe(winnerOwner);
});

it('never lets concurrent fan-outs oversubscribe one parent budget', async () => {
  harness = await startHarness();
  const [alpha, bravo] = await Promise.all([harness.mcp('alpha'), harness.mcp('bravo')]);

  const parent = await call(alpha, 'work_create', {
    intent: 'decompose the migration',
    budget: { tokens: 1000 },
    idempotency_key: 'fq9-fanout-parent',
  });
  const parentId = parent.id as string;

  // Two batches of 600 against 1000 remaining. Either one fits; both do not.
  const batch = (label: string): Record<string, unknown> => ({
    parent_id: parentId,
    idempotency_key: `fq9-fanout-${label}`,
    children: [
      { intent: `${label} first leg`, budget: { tokens: 300 } },
      { intent: `${label} second leg`, budget: { tokens: 300 } },
    ],
  });

  const results = await Promise.all([
    alpha.callTool({ name: 'work_fan_out', arguments: batch('alpha') }),
    bravo.callTool({ name: 'work_fan_out', arguments: batch('bravo') }),
  ]);

  const rejected = results.filter((r) => failed(r));
  expect(rejected).toHaveLength(1);
  expect(resultText(rejected[0])).toMatch(/budget oversubscription/);

  // The budget is what the assertion is really about: whatever interleaving
  // produced, the children committed against this parent must still fit inside
  // it. The fan-out ratio the build order depends on is only meaningful if this
  // holds under squad traffic.
  const tree = await readJson(alpha, `workitem://${parentId}/tree?depth=1&attention_only=false`);
  const children = (tree.items as Array<Record<string, unknown>>).filter(
    (i) => i.parent_id === parentId,
  );
  const committed = children.reduce(
    (sum, c) => sum + Number((c.budget as { tokens?: number } | null)?.tokens ?? 0),
    0,
  );
  expect(committed).toBeLessThanOrEqual(1000);
  // A rejected batch must leave nothing behind: partial children would be worse
  // than a refusal, because the parent's remaining budget would be wrong.
  expect(children).toHaveLength(2);
});

it('resolves each concurrent request against the principal in its own header', async () => {
  harness = await startHarness();
  const [alpha, bravo] = await Promise.all([harness.mcp('alpha'), harness.mcp('bravo')]);

  const [alphaItem, bravoItem] = await Promise.all([
    call(alpha, 'work_create', { intent: 'alpha leg', idempotency_key: 'fq9-principal-alpha' }),
    call(bravo, 'work_create', { intent: 'bravo leg', idempotency_key: 'fq9-principal-bravo' }),
  ]);
  const [alphaClaim, bravoClaim] = await Promise.all([
    call(alpha, 'work_claim', { work_item_id: alphaItem.id, confidence: 0.7 }),
    call(bravo, 'work_claim', { work_item_id: bravoItem.id, confidence: 0.7 }),
  ]);

  const alphaOwner = alphaClaim.owner_id as string;
  const bravoOwner = bravoClaim.owner_id as string;
  expect(alphaOwner).toEqual(expect.stringMatching(/^pr_/));
  expect(bravoOwner).not.toBe(alphaOwner);

  // The header is a display name; /mcp resolves it through ensureAgent, so the
  // principal id is never the header value. Asserting the chain is what proves
  // each request was resolved against its own header rather than a principal
  // cached from whichever request arrived first: the claim entry names the
  // agent, and its author is the principal that now owns that item.
  for (const [name, itemId, owner] of [
    ['alpha', alphaItem.id as string, alphaOwner],
    ['bravo', bravoItem.id as string, bravoOwner],
  ] as const) {
    const stored = await readJson(alpha, `workitem://${itemId}`);
    const claim = (stored.transcript as Entry[]).find(
      (e) => e.kind === 'state_change' && e.body === `claimed by ${name}`,
    );
    expect(claim, `no claim by ${name} on its own item`).toBeDefined();
    expect(claim?.author_id).toBe(owner);
  }

  // And the queues do not bleed into each other.
  const alphaQueue = await readJson(alpha, `principal://${alphaOwner}/queue`);
  const bravoQueue = await readJson(bravo, `principal://${bravoOwner}/queue`);
  expect((alphaQueue.items as Array<{ id: string }>).map((i) => i.id)).toEqual([alphaItem.id]);
  expect((bravoQueue.items as Array<{ id: string }>).map((i) => i.id)).toEqual([bravoItem.id]);
});

it("resolves two agents' blocking escalations independently", async () => {
  slack = await startSlackFake();
  harness = await startHarness({ slack });
  const [alpha, bravo] = await Promise.all([harness.mcp('alpha'), harness.mcp('bravo')]);

  // Returns the *unawaited* call: the agent is parked in the service's waiter
  // map until a tap or the timeout. Wrapped in an object because an async
  // function that returned the promise directly would adopt it and block here.
  const raise = async (
    client: Client,
    label: string,
    question: string,
  ): Promise<{ pending: Promise<unknown> }> => {
    const item = await call(client, 'work_create', {
      intent: `${label} rollout`,
      blast_radius: 'irreversible',
      idempotency_key: `fq9-escalation-${label}`,
    });
    // irreversible blast plus low declared confidence keeps severity above the
    // digest threshold, so each card is posted rather than batched.
    await call(client, 'work_claim', { work_item_id: item.id, confidence: 0.2 });
    const pending = client.callTool({
      name: 'work_escalate',
      arguments: {
        work_item_id: item.id,
        kind: 'approval',
        question,
        options: [
          { id: 'ship', label: 'Ship it' },
          { id: 'hold', label: 'Hold' },
        ],
        context_summary: `${label}'s release is staged and the rollout is irreversible.`,
        blocking: true,
        timeout_seconds: 30,
      },
    });
    // If an assertion below fails, teardown closes the client and this promise
    // rejects with nobody awaiting it. Keep that from masking the real failure.
    void pending.catch(() => undefined);
    return { pending };
  };

  const alphaEscalation = await raise(alpha, 'alpha', 'Ship the alpha rollout now?');
  const bravoEscalation = await raise(bravo, 'bravo', 'Ship the bravo rollout now?');

  const cardFor = (question: string): Promise<{ body: unknown }> =>
    slack!.awaitPost((p) => p.url === '/webhook' && JSON.stringify(p.body).includes(question), {
      label: `the card asking "${question}"`,
    });

  // Each card is found by its own question, so neither agent's identity is
  // assumed from arrival order.
  const alphaAction = actionIdForOption((await cardFor('alpha rollout')).body, 'Ship it');
  const bravoAction = actionIdForOption((await cardFor('bravo rollout')).body, 'Ship it');
  expect(alphaAction).not.toBe(bravoAction);

  const answer = (actionId: string, label: string): Promise<Response> =>
    tap(
      harness!.baseUrl,
      blockActionsForm({
        actionId,
        userName: DEFAULT_HUMAN,
        responseUrl: slack!.responseUrl(label),
      }),
      { signingSecret: DEFAULT_SIGNING_SECRET },
    );

  // One tap. The waiter map is keyed per escalation, so it must wake exactly
  // one of the two parked agents.
  await answer(alphaAction, 'alpha');

  const alphaOutcome = toolJson(await alphaEscalation.pending);
  expect(alphaOutcome.outcome).toMatchObject({ resolution: 'answered', chosen_option_id: 'ship' });
  expect((alphaOutcome.escalation as Record<string, unknown>).id).toBe(alphaAction.split(':')[1]);

  // The other agent is still blocked. This is the half that would fail if one
  // tap woke every waiter, and the only way to prove a *non*-release.
  await stillPending(bravoEscalation.pending, 250);

  await answer(bravoAction, 'bravo');
  const bravoOutcome = toolJson(await bravoEscalation.pending);
  expect(bravoOutcome.outcome).toMatchObject({ resolution: 'answered', chosen_option_id: 'ship' });
  expect((bravoOutcome.escalation as Record<string, unknown>).id).toBe(bravoAction.split(':')[1]);
});
