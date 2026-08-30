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

it('carries an agent through create, claim and escalate over a real MCP connection', async () => {
  // No `slack`: the log-only deployment, with no SlackBridge constructed at
  // all. Releasing a blocked agent needs the fake and the signed tap, which is
  // slice 0b — this slice proves the MCP hop alone.
  harness = await startHarness();
  const agent = await harness.mcp('scout');

  expect(harness.slack).toBeUndefined();

  const item = await call(agent, 'work_create', {
    intent: 'roll the release out to production',
    blast_radius: 'irreversible',
    idempotency_key: 'fq5a-mcp-round-trip',
  });
  const workItemId = item.id as string;
  expect(workItemId).toEqual(expect.any(String));

  await call(agent, 'work_claim', { work_item_id: workItemId, confidence: 0.2 });

  // Non-blocking: the service returns as soon as the escalation is recorded,
  // with `outcome: null` because nobody has answered and nothing is waiting.
  const escalated = await call(agent, 'work_escalate', {
    work_item_id: workItemId,
    kind: 'approval',
    question: 'Roll out to production now?',
    context_summary: 'Release is staged and the rollout is irreversible once started.',
    options: [
      { id: 'ship', label: 'Ship it' },
      { id: 'hold', label: 'Hold' },
    ],
  });

  const escalation = escalated.escalation as Record<string, unknown>;
  expect(escalation.id).toEqual(expect.any(String));
  expect(escalation.resolved_at).toBeNull();
  expect(escalated.outcome).toBeNull();

  // Read the item back over the wire rather than through the service, so this
  // asserts the resource surface and the transport too, not just the tools.
  // `workitem://{id}` returns `{ item, transcript }`, not a bare item.
  const read = await agent.readResource({ uri: `workitem://${workItemId}` });
  const [entry] = read.contents;
  if (!entry || !('text' in entry)) throw new Error('workitem resource returned no text content');
  const stored = JSON.parse(entry.text) as { item: Record<string, unknown> };

  expect(stored.item.id).toBe(workItemId);
  // `claim` sets owner_id and confidence; `escalate(kind:'approval')` then moves
  // the item out of `running`. Both hops are visible in one read.
  expect(stored.item.owner_id).toBe('scout');
  expect(stored.item.confidence).toBe(0.2);
  expect(stored.item.state).toBe('awaiting_approval');
});
