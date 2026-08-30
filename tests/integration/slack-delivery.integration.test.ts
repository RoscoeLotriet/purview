import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_HUMAN, DEFAULT_SIGNING_SECRET, startHarness } from './harness/purview.js';
import type { PurviewHarness } from './harness/purview.js';
import { actionIdForOption, blockActionsForm } from './harness/sign.js';
import { startSlackFake, type SlackFake } from './harness/slack-fake.js';
import { tap } from './harness/tap.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Gap 3, tests 12-15. `src/slack/bridge.ts` is the only code in Purview that
 * makes an outbound HTTP request, and nothing exercises it against a server:
 * `tests/slack.test.ts` asserts Block Kit rendering and never a delivery. These
 * drive the bridge over a real socket to a fake Slack, including its failure
 * path, which `SlackFake.failNext` provokes without touching `src/`.
 *
 * Tests 16 and 17 (the digest) are **not here** — see the file-level note at
 * the bottom of this comment.
 *
 * `PurviewService.flushDigest` has no wire trigger: no MCP tool and no HTTP
 * route reaches it, and the only production caller is the `DIGEST_INTERVAL_MS`
 * timer in `src/server.ts`. Reaching it at integration altitude therefore needs
 * the spawned entrypoint from `harness/server-proc.ts` (slice 2a, #7), which
 * this slice's spec did not list as a dependency. Deferred to a follow-up
 * rather than worked around here, because every workaround is a scope decision
 * this run does not own.
 */

let harness: PurviewHarness | undefined;
let slack: SlackFake | undefined;

afterEach(async () => {
  vi.restoreAllMocks();
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

/** An irreversible item at low confidence: severity above IMMEDIATE_THRESHOLD,
 *  so the card is posted rather than batched into a digest. */
async function claimedItem(agent: Client, key: string): Promise<string> {
  const item = await call(agent, 'work_create', {
    intent: 'roll the release out to production',
    blast_radius: 'irreversible',
    idempotency_key: key,
  });
  const workItemId = item.id as string;
  await call(agent, 'work_claim', { work_item_id: workItemId, confidence: 0.2 });
  return workItemId;
}

const ESCALATION_ARGS = {
  kind: 'approval',
  question: 'Roll out to production now?',
  options: [
    { id: 'ship', label: 'Ship it' },
    { id: 'hold', label: 'Hold' },
  ],
  context_summary: 'Release is built and green; the deploy window closes in an hour.',
  timeout_seconds: 60,
};

async function escalate(agent: Client, workItemId: string): Promise<Record<string, unknown>> {
  const result = await call(agent, 'work_escalate', {
    ...ESCALATION_ARGS,
    work_item_id: workItemId,
    blocking: false,
  });
  return result.escalation as Record<string, unknown>;
}

/**
 * `PurviewService.notify` swallows every bridge failure and leaves one line on
 * stderr. Spying on it is how a test can tell "delivery failed and was
 * swallowed" from "delivery never happened" — the two are otherwise identical
 * from outside, which is the whole subject of test 15.
 */
function captureSwallowedFailures(): () => string[] {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  return () =>
    spy.mock.calls
      .map((args) => args.map(String).join(' '))
      .filter((line) => line.includes('escalation bridge delivery failed'));
}

interface CardButton {
  type?: string;
  action_id?: string;
  text?: { type?: string; text?: string };
}
interface CardBlock {
  type?: string;
  elements?: CardButton[];
}

it('delivers the card as Block Kit JSON with one button per option', async () => {
  slack = await startSlackFake();
  harness = await startHarness({ slack });
  const agent = await harness.mcp('scout');
  const workItemId = await claimedItem(agent, 'fq8-card-shape');

  const escalation = await escalate(agent, workItemId);
  const card = await slack.awaitPost((p) => p.url === '/webhook', {
    label: 'the escalation card at the fake Slack webhook',
  });

  // The wire shape, not the render: `tests/slack.test.ts` already asserts what
  // `escalationBlocks` returns. What has never been checked is that the thing
  // rendered is the thing sent, with the content type Slack requires.
  expect(card.headers['content-type']).toBe('application/json');

  const body = card.body as { text?: string; blocks?: CardBlock[] };
  expect(body.text).toBe(ESCALATION_ARGS.question);

  const actions = body.blocks?.find((b) => b.type === 'actions');
  expect(actions, 'the delivered card carried no actions block').toBeDefined();
  expect(actions?.elements).toHaveLength(ESCALATION_ARGS.options.length);

  // One button per option, each carrying an id that resolves *this* escalation.
  // A card whose buttons name a different escalation would render identically.
  for (const option of ESCALATION_ARGS.options) {
    expect(actionIdForOption(card.body, option.label)).toBe(
      `resolve:${String(escalation.id)}:${option.id}`,
    );
  }
});

it('does not fail the agent when Slack answers 500 on the card', async () => {
  slack = await startSlackFake();
  harness = await startHarness({ slack });
  const agent = await harness.mcp('scout');
  const workItemId = await claimedItem(agent, 'fq8-delivery-500');
  const swallowed = captureSwallowedFailures();

  // CHARACTERIZATION of a deliberate decision, not an accident.
  // `PurviewService.notify` catches every bridge failure on the reasoning that
  // a Slack outage must never take down an agent's write path. This pins that
  // reasoning as behaviour: the escalate call returns normally.
  slack.failNext(500);
  const escalation = await escalate(agent, workItemId);

  expect(escalation.id).toEqual(expect.any(String));
  expect(escalation.resolved_at).toBeNull();

  // The 500 was actually reached and actually swallowed. Without this the test
  // would also pass if the card had never been posted at all.
  expect(swallowed()).toHaveLength(1);
});

it('still resolves and still releases the agent after a Slack 500 on the card', async () => {
  slack = await startSlackFake();
  harness = await startHarness({ slack });
  const agent = await harness.mcp('scout');
  const workItemId = await claimedItem(agent, 'fq8-resolvable-after-500');
  const swallowed = captureSwallowedFailures();

  slack.failNext(500);
  // Hold this promise: the agent is parked in the waiter map until a tap.
  const escalated = agent.callTool({
    name: 'work_escalate',
    arguments: { ...ESCALATION_ARGS, work_item_id: workItemId, blocking: true },
  });
  void escalated.catch(() => undefined);

  // The fake records the request before answering 500, so the card a human
  // never saw is still readable here — which is exactly the point: the
  // escalation is intact and addressable, only undelivered.
  const card = await slack.awaitPost((p) => p.url === '/webhook', {
    label: 'the escalation card that Slack rejected with a 500',
  });
  expect(swallowed()).toHaveLength(1);

  const form = blockActionsForm({
    actionId: actionIdForOption(card.body, 'Ship it'),
    userName: DEFAULT_HUMAN,
    responseUrl: slack.responseUrl('after-500'),
  });
  await tap(harness.baseUrl, form, { signingSecret: DEFAULT_SIGNING_SECRET });

  const outcome = toolJson(await escalated).outcome as Record<string, unknown>;
  expect(outcome).toMatchObject({ resolution: 'answered', chosen_option_id: 'ship' });
});

/** Fields that differ between any two escalations regardless of delivery. */
const VOLATILE = new Set(['id', 'work_item_id', 'created_at', 'timeout_at']);

function deliveryIndependentFields(e: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(e).filter(([key]) => !VOLATILE.has(key)));
}

it('leaves no signal on the escalation record when Slack drops the card', async () => {
  // THE BLIND SPOT, ASSERTED — a deliberate placeholder, scoped to the
  // escalation record's own fields rather than to "no signal anywhere".
  //
  // When delivery fails the escalation exists, no human ever sees it, the agent
  // blocks until timeout, and the only trace is a line on stderr. Nothing in
  // the data model distinguishes "delivered" from "silently dropped". Product
  // spec §7 tells a reader to interpret high timeout rates and long escalation
  // latency as "routing isn't working" — so a misconfigured webhook and a
  // failed product premise produce the same dashboard.
  //
  // Issue #12 ("record Slack delivery outcome so a dropped escalation is
  // observable") is the fix. **This test is written to be flipped.** When #12
  // lands, a dropped delivery will be distinguishable and this assertion must
  // be deliberately inverted rather than deleted — its failure is the signal
  // that the blind spot closed.
  slack = await startSlackFake();
  harness = await startHarness({ slack });
  const agent = await harness.mcp('scout');
  const swallowed = captureSwallowedFailures();

  const delivered = await escalate(agent, await claimedItem(agent, 'fq8-signal-delivered'));
  await slack.awaitPost((p) => p.url === '/webhook', { label: 'the delivered card' });
  expect(swallowed()).toHaveLength(0);

  slack.failNext(500);
  const dropped = await escalate(agent, await claimedItem(agent, 'fq8-signal-dropped'));
  expect(swallowed()).toHaveLength(1);

  // Two escalations, identical but for one that Slack accepted and one it threw
  // away. Comparing them against each other is what makes this absence
  // assertion bite: it cannot pass merely because nothing was broken.
  expect(deliveryIndependentFields(dropped)).toEqual(deliveryIndependentFields(delivered));
});
