import { afterEach, expect, it } from 'vitest';
import { DEFAULT_HUMAN, DEFAULT_SIGNING_SECRET, startHarness } from './harness/purview.js';
import type { PurviewHarness } from './harness/purview.js';
import { actionIdForOption, blockActionsForm } from './harness/sign.js';
import { startSlackFake, type SlackFake } from './harness/slack-fake.js';
import { tap } from './harness/tap.js';
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

/**
 * Every tool result is `jsonResult(...)`: one text block holding JSON. Parsing
 * it here keeps the test on the wire surface — the harness may construct the
 * system, but a test body drives it only through /mcp and /slack/interactions.
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

it('releases a blocked agent when a signed Slack tap answers the card', async () => {
  slack = await startSlackFake();
  harness = await startHarness({ slack });
  const agent = await harness.mcp('scout');

  // irreversible blast plus low declared confidence keeps severity well above
  // the digest threshold, so the card is posted rather than batched.
  const item = await call(agent, 'work_create', {
    intent: 'roll the release out to production',
    blast_radius: 'irreversible',
    idempotency_key: 'fq18-round-trip',
  });
  const workItemId = item.id as string;
  await call(agent, 'work_claim', { work_item_id: workItemId, confidence: 0.2 });

  // Hold this promise: the agent is parked in the service's waiter map until
  // a tap or the timeout, and nothing below may await it yet.
  const escalated = agent.callTool({
    name: 'work_escalate',
    arguments: {
      work_item_id: workItemId,
      kind: 'approval',
      question: 'Roll out to production now?',
      options: [
        { id: 'ship', label: 'Ship it' },
        { id: 'hold', label: 'Hold' },
      ],
      context_summary: 'Release is built and green; the deploy window closes in an hour.',
      blocking: true,
      timeout_seconds: 30,
    },
  });
  // If an assertion below fails, teardown closes the client and this promise
  // rejects with nobody awaiting it. Keep that from masking the real failure.
  void escalated.catch(() => undefined);

  const card = await slack.awaitPost((p) => p.url === '/webhook', {
    label: 'the escalation card at the fake Slack webhook',
  });

  // From the card, not from the tool result: the point is that what a human
  // taps carries a resolvable identity.
  const actionId = actionIdForOption(card.body, 'Ship it');
  expect(actionId).toMatch(/^resolve:esc[-_a-zA-Z0-9]*:ship$/);

  const form = blockActionsForm({
    actionId,
    userName: DEFAULT_HUMAN,
    responseUrl: slack.responseUrl('round-trip'),
  });
  // No assertion on this response. /slack/interactions acks with 200 before it
  // does any work (src/http/app.ts), so its status proves nothing.
  await tap(harness.baseUrl, form, { signingSecret: DEFAULT_SIGNING_SECRET });

  const outcome = toolJson(await escalated);
  expect(outcome.outcome).toMatchObject({ resolution: 'answered', chosen_option_id: 'ship' });

  const escalation = outcome.escalation as Record<string, unknown>;
  expect(escalation.id).toBe(actionId.split(':')[1]);
  expect(escalation.resolved_at).toEqual(expect.any(String));
});
