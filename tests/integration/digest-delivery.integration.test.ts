import { afterEach, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startServerProc, type ServerProc } from './harness/server-proc.js';
import { startSlackFake, type RecordedPost, type SlackFake } from './harness/slack-fake.js';

/**
 * Gap 3, tests 16 and 17 — the digest half of slice 3, split out of #8 during
 * implementation (`slack-delivery.integration.test.ts` records why). Band
 * routing reaches the bridge by a different path from a card: `postDigest`,
 * batched, rather than `postEscalation` per escalation.
 *
 * `PurviewService.flushDigest` has no wire trigger — no MCP tool and no HTTP
 * route reaches it, and `harness/purview.ts` does not expose the service it
 * builds. Its only production caller is the `DIGEST_INTERVAL_MS` timer in
 * `src/server.ts`, so these two tests drive the *spawned entrypoint*
 * (`harness/server-proc.ts`, slice 2a) and let the child process fire its own
 * digest on its own real timer. A human confirmed that choice over constructing
 * `PurviewService` and `SlackBridge` inline: an inline fork would put the test
 * body on a service method and would no longer be testing the assembly
 * `startHarness` builds, which is the shape of bug this suite exists to catch.
 */

/**
 * Short enough that a flush is never the slow part of either test, long enough
 * that the cadence is the child's rather than a busy loop. Real timers only.
 */
const DIGEST_INTERVAL_MS = 250;

const OPTIONS = [
  { id: 'approve', label: 'Approve' },
  { id: 'defer', label: 'Defer' },
];

let proc: ServerProc | undefined;
let slack: SlackFake | undefined;
let clients: Client[] = [];

afterEach(async () => {
  for (const client of clients) await client.close();
  clients = [];
  // Runs even when the test threw, which is the point: a child left running
  // holds a port for the rest of the session.
  await proc?.stop();
  proc = undefined;
  await slack?.close();
  slack = undefined;
});

/**
 * The entrypoint with a digest cadence and a webhook it can reach. An explicit
 * `undefined` unsets `SLACK_SIGNING_SECRET`: neither test taps a button, and an
 * ambient secret would only add a variable neither test controls.
 */
async function start(fake: SlackFake): Promise<ServerProc> {
  proc = await startServerProc({
    env: {
      DIGEST_INTERVAL_MS: String(DIGEST_INTERVAL_MS),
      SLACK_WEBHOOK_URL: fake.webhookUrl,
      SLACK_SIGNING_SECRET: undefined,
    },
  });
  return proc;
}

async function mcp(baseUrl: string, principal: string): Promise<Client> {
  const client = new Client({ name: 'purview-integration', version: '0.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
      requestInit: { headers: { 'x-purview-principal': principal } },
    }),
  );
  clients.push(client);
  return client;
}

/** Every tool result is one text block holding JSON. Parsing it here keeps the test on the wire. */
function toolJson(result: unknown): Record<string, unknown> {
  const { content, isError } = result as { content?: Array<{ text?: string }>; isError?: boolean };
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

/**
 * A `none` blast radius claimed at high confidence. Severity works out to 0.12:
 * 0.4 x 0 (none) + 0.2 x 0.1 (confidence 0.9) + 0 (no deadline) + 0.2 x 0.5
 * (default root priority, because an agent created the item and only a human
 * may set one). That is below `QUEUED_THRESHOLD` (0.4), so `routeEscalation`
 * returns `digest` and `PurviewService.escalate` skips `postEscalation` on its
 * `band !== 'digest'` guard. Both tests assert the band, so a weight change
 * fails loudly rather than as a bare `awaitPost` timeout.
 */
async function lowSeverityItem(agent: Client, key: string): Promise<string> {
  const item = await call(agent, 'work_create', {
    intent: 'tidy the changelog before the release notes go out',
    blast_radius: 'none',
    idempotency_key: key,
  });
  const workItemId = item.id as string;
  await call(agent, 'work_claim', { work_item_id: workItemId, confidence: 0.9 });
  return workItemId;
}

async function escalate(
  agent: Client,
  workItemId: string,
  args: { question: string; timeout_seconds: number },
): Promise<Record<string, unknown>> {
  const result = await call(agent, 'work_escalate', {
    work_item_id: workItemId,
    kind: 'approval',
    options: OPTIONS,
    context_summary: 'Low blast radius and no deadline; it can wait for the next digest.',
    blocking: false,
    ...args,
  });
  return result.escalation as Record<string, unknown>;
}

interface SlackButton {
  action_id?: string;
}
interface SlackBlock {
  type?: string;
  text?: { text?: string };
  elements?: SlackButton[];
}

function blocksOf(post: RecordedPost): SlackBlock[] {
  return (post.body as { blocks?: SlackBlock[] }).blocks ?? [];
}

/**
 * A webhook delivery is a digest iff its first block is the digest header.
 * `digestBlocks` opens with a `header`; `escalationBlocks` opens with a
 * `section`, and those two are the only things `SlackBridge` ever posts to the
 * webhook. The partition is therefore total: "not a digest" means "an
 * individual card", so the absence assertion built on it cannot pass vacuously
 * against a card whose text or blocks were reworded.
 */
function isDigest(post: RecordedPost): boolean {
  return blocksOf(post)[0]?.type === 'header';
}

function individualCards(fake: SlackFake): RecordedPost[] {
  return fake.posts.filter((p) => p.url === '/webhook' && !isDigest(p));
}

/** Every `action_id` in this message that names `escalationId` — its buttons. */
function buttonsFor(post: RecordedPost, escalationId: string): string[] {
  return blocksOf(post)
    .filter((b) => b.type === 'actions')
    .flatMap((b) => b.elements ?? [])
    .map((e) => e.action_id ?? '')
    .filter((id) => id.includes(`:${escalationId}:`));
}

/** The digest section rendering `question`, if this message carries one. */
function entryFor(post: RecordedPost, question: string): string | undefined {
  return blocksOf(post)
    .filter((b) => b.type === 'section')
    .map((b) => b.text?.text ?? '')
    .find((text) => text.includes(question));
}

it('batches a low-severity escalation into a digest instead of posting a card', async () => {
  const question = 'Drop the deprecated changelog section?';
  slack = await startSlackFake();
  const server = await start(slack);
  const agent = await mcp(server.baseUrl, 'scout');
  const workItemId = await lowSeverityItem(agent, 'fq28-digest-batch');

  // Long enough that it is still open when the digest goes out: a timeout would
  // turn this into test 17.
  const escalation = await escalate(agent, workItemId, { question, timeout_seconds: 600 });
  const escalationId = escalation.id as string;
  expect(escalation.routing).toBe('digest');

  // Half one, the suppression. `PurviewService.escalate` awaits
  // `postEscalation` before returning, so a card would already be recorded
  // here — this is a settled fact rather than a race with the digest timer.
  expect(individualCards(slack), 'an individual card was posted for a digest-band escalation')
    .toHaveLength(0);

  // Half two, the delivery. Suppression alone is also satisfied by a system
  // that drops low-severity escalations on the floor, which is the failure this
  // test is actually guarding against.
  const digest = await slack.awaitPost((p) => p.url === '/webhook' && isDigest(p), {
    label: 'a digest at the fake Slack webhook',
  });
  expect(entryFor(digest, question), 'the digest did not carry the escalation').toBeDefined();

  // And it is *this* escalation, not merely one that reads the same: an open
  // entry carries a button per option, each naming the escalation it resolves.
  // That presence is what makes test 17's absence assertion mean something.
  expect(buttonsFor(digest, escalationId)).toEqual(
    OPTIONS.map((o) => `resolve:${escalationId}:${o.id}`),
  );

  // Nothing turned into a card later either.
  expect(individualCards(slack)).toHaveLength(0);
});

it('renders an already-resolved escalation in the digest as a fact with no buttons', async () => {
  // Distinct from test 16's: with no escalation id in a resolved digest entry,
  // the question is what identifies it in the delivered blocks.
  const question = 'Reword the deprecation note before it ships?';
  slack = await startSlackFake();
  const server = await start(slack);
  const agent = await mcp(server.baseUrl, 'scout');
  const workItemId = await lowSeverityItem(agent, 'fq28-resolved-fact');

  // Nobody taps, so `handleTimeout` resolves it by timeout (J5) and pushes it
  // onto `timeoutFacts`, which `pendingDigest` returns whether or not the open
  // entry was already flushed as a request. `timeout_action` defaults to
  // `proceed` for a `none` blast radius.
  const escalation = await escalate(agent, workItemId, { question, timeout_seconds: 1 });
  const escalationId = escalation.id as string;
  expect(escalation.routing).toBe('digest');

  // Earlier flushes carry it as an open request; this waits for the one that
  // carries it as a resolved fact.
  const digest = await slack.awaitPost(
    (p) => p.url === '/webhook' && isDigest(p) && (entryFor(p, question)?.includes('Timed out') ?? false),
    {
      timeoutMs: 10_000,
      label: 'a digest carrying the timed-out escalation as a resolved fact',
    },
  );

  // The defect this re-pins was found during PR #1 verification: a resolved
  // entry rendered with its option buttons still attached, inviting a human to
  // answer a question that had already been decided. Asserting the outcome text
  // alone would not have caught it, because the outcome text was correct.
  expect(
    buttonsFor(digest, escalationId),
    'the resolved digest entry still carried option buttons',
  ).toEqual([]);

  // Never a card: the band held all the way through the timeout.
  expect(individualCards(slack)).toHaveLength(0);
});
