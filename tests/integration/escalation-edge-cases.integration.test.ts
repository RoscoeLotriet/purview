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

function outcomeOf(result: Record<string, unknown>): Record<string, unknown> {
  return result.outcome as Record<string, unknown>;
}

interface ParkedAgent {
  agent: Client;
  workItemId: string;
  baseUrl: string;
  fake: SlackFake;
  /** The held escalate call. Nothing may await it until a test means to. */
  escalated: Promise<unknown>;
  /** `resolve:<escalation_id>:ship`, read off the card the fake recorded. */
  actionId: string;
  escalationId: string;
}

/**
 * Stand the system up and park an agent on a blocking approval, stopping at the
 * point a human is looking at a card and has not yet tapped it. Every test below
 * starts here and differs only in what arrives next.
 *
 * `blast_radius: 'irreversible'` plus low declared confidence keeps severity well
 * above the digest threshold, so the card is posted rather than batched — the same
 * lever the round-trip test pulls. Each test gets its own harness, so the routing
 * budget that would eventually push a card into the digest band never accumulates.
 */
async function parkOnEscalation(opts: {
  timeoutSeconds: number;
  idempotencyKey: string;
}): Promise<ParkedAgent> {
  slack = await startSlackFake();
  harness = await startHarness({ slack });
  const agent = await harness.mcp('scout');

  const item = await call(agent, 'work_create', {
    intent: 'roll the release out to production',
    blast_radius: 'irreversible',
    idempotency_key: opts.idempotencyKey,
  });
  const workItemId = item.id as string;
  await call(agent, 'work_claim', { work_item_id: workItemId, confidence: 0.2 });

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
      timeout_seconds: opts.timeoutSeconds,
    },
  });
  // If an assertion below fails, teardown closes the client and this promise
  // rejects with nobody awaiting it. Keep that from masking the real failure.
  void escalated.catch(() => undefined);

  const card = await slack.awaitPost((p) => p.url === '/webhook', {
    label: 'the escalation card at the fake Slack webhook',
  });

  // From the card, not from the tool result: what a human taps is the only
  // identity these tests are allowed to know.
  const actionId = actionIdForOption(card.body, 'Ship it');
  const escalationId = actionId.split(':')[1];
  if (!escalationId) throw new Error(`card action_id carried no escalation id: ${actionId}`);

  return {
    agent,
    workItemId,
    baseUrl: harness.baseUrl,
    fake: slack,
    escalated,
    actionId,
    escalationId,
  };
}

function signedTap(baseUrl: string, actionId: string, responseUrl: string): Promise<Response> {
  // No assertion is ever made on this response. /slack/interactions acks with
  // 200 before it does any work (src/http/app.ts), so its status proves nothing.
  return tap(baseUrl, blockActionsForm({ actionId, userName: DEFAULT_HUMAN, responseUrl }), {
    signingSecret: DEFAULT_SIGNING_SECRET,
  });
}

/** Long enough that a release would have happened, short enough to pay for twice. */
const NON_RELEASE_WINDOW_MS = 500;

interface ReplacementBody {
  replace_original?: boolean;
  blocks?: Array<{ type?: string }>;
}

it('replaces the original card at response_url when a tap resolves the escalation', async () => {
  const { escalated, actionId, escalationId, baseUrl, fake } = await parkOnEscalation({
    timeoutSeconds: 30,
    idempotencyKey: 'fq6-replace-original',
  });

  await signedTap(baseUrl, actionId, fake.responseUrl('replace'));

  const replacement = await fake.awaitResponse((p) => p.url === '/response/replace', {
    label: 'the resolved card delivered to response_url',
  });
  const body = replacement.body as ReplacementBody;
  expect(body.replace_original).toBe(true);

  // The resolved card states the outcome and withdraws the buttons. A card that
  // kept its actions block would invite a second tap on a closed decision.
  expect(body.blocks?.some((b) => b.type === 'actions')).toBe(false);
  const rendered = JSON.stringify(body.blocks);
  expect(rendered).toContain('Ship it');
  expect(rendered).toContain(escalationId);

  // The replacement is not a substitute for releasing the agent.
  expect(outcomeOf(toolJson(await escalated))).toMatchObject({ chosen_option_id: 'ship' });
});

it('does not release the agent when the tap is unsigned', async () => {
  const { escalated, actionId, baseUrl, fake } = await parkOnEscalation({
    timeoutSeconds: 30,
    idempotencyKey: 'fq6-unsigned-tap',
  });

  const form = blockActionsForm({
    actionId,
    userName: DEFAULT_HUMAN,
    responseUrl: fake.responseUrl('unsigned'),
  });
  await tap(baseUrl, form, { signed: false });

  // The assertion this test exists for. Asserting a 401 instead would be a
  // weaker claim about a different subject: a verification bypass that still
  // answered 401 to the caller passes that check and fails this one.
  await stillPending(escalated, NON_RELEASE_WINDOW_MS);
  expect(fake.responses).toHaveLength(0);

  // And the rejection is the signature, not the payload: the same form, signed,
  // releases the agent. Without this the test above could pass on a tap that
  // was malformed for some unrelated reason.
  await signedTap(baseUrl, actionId, fake.responseUrl('unsigned'));
  expect(outcomeOf(toolJson(await escalated))).toMatchObject({
    resolution: 'answered',
    chosen_option_id: 'ship',
  });
});

it('leaves the escalation open when a signed tap names an unknown option', async () => {
  const { escalated, actionId, escalationId, baseUrl, fake } = await parkOnEscalation({
    timeoutSeconds: 30,
    idempotencyKey: 'fq6-unknown-option',
  });

  // Correctly signed and well formed: only the option is not one that was offered.
  const forged = `resolve:${escalationId}:not-an-option`;
  expect(forged).not.toBe(actionId);
  await signedTap(baseUrl, forged, fake.responseUrl('unknown'));

  await stillPending(escalated, NON_RELEASE_WINDOW_MS);
  expect(fake.responses).toHaveLength(0);

  // Open, not merely unreleased. An escalation the seam had quietly closed
  // would also leave the agent blocked, and this is what tells them apart.
  await signedTap(baseUrl, actionId, fake.responseUrl('unknown'));
  expect(outcomeOf(toolJson(await escalated))).toMatchObject({
    resolution: 'answered',
    chosen_option_id: 'ship',
  });
});

it('returns timed_out and applies the declared timeout action when nobody taps', async () => {
  // Real timers throughout this project: fake timers cannot be mixed with real
  // sockets, and the unit suite already covers the timeout logic that way. One
  // second is what makes the J5 path affordable to prove end to end here.
  const { escalated, agent, workItemId } = await parkOnEscalation({
    timeoutSeconds: 1,
    idempotencyKey: 'fq6-timeout',
  });

  const result = toolJson(await escalated);
  expect(outcomeOf(result)).toMatchObject({ resolution: 'timed_out', chosen_option_id: null });

  const escalation = result.escalation as Record<string, unknown>;
  expect(escalation).toMatchObject({
    resolution: 'timed_out',
    // Nobody answered, so no human is recorded as having decided this.
    resolved_by_id: null,
    // An irreversible blast radius selects `abort` when the caller declares no
    // timeout_action of its own.
    timeout_action: 'abort',
  });

  // And `abort` is applied, not just recorded: the item ends failed rather than
  // sitting in awaiting_approval forever with nobody coming.
  const queried = await call(agent, 'work_query', { work_item_id: workItemId });
  const items = queried.items as Array<{ id: string; state: string }>;
  expect(items.find((i) => i.id === workItemId)?.state).toBe('failed');
});
