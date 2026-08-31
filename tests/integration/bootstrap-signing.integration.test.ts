import { afterEach, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startServerProc, type ServerProc } from './harness/server-proc.js';
import { actionIdForOption, blockActionsForm } from './harness/sign.js';
import { startSlackFake, type SlackFake } from './harness/slack-fake.js';
import { tap } from './harness/tap.js';
import { stillPending } from './harness/wait.js';

/**
 * Gap 2, tests 7, 8 and 10 — the configuration half of slice 2, split from
 * tests 6, 9 and 11 (`bootstrap-config.integration.test.ts`) at the point
 * agreed in advance at gate 4 (docs/factory/specs/FQ-3/04-slices.md). Slice 2a
 * asks whether the process comes up. These ask what its environment decides:
 * whether an unsigned tap is refused, and who an answer is credited to.
 *
 * The real entrypoint is spawned as a child process, so `SLACK_SIGNING_SECRET`
 * and `PURVIEW_HUMAN` are read the way a deployment sets them rather than
 * handed to `buildApp` inside the test process.
 */

const SIGNING_SECRET = 'bootstrap-signing-secret';
/**
 * Deliberately not `operator`, the name `src/server.ts` falls back to when
 * `PURVIEW_HUMAN` is unset. A test that configured the default name would pass
 * against an entrypoint that ignored the variable entirely.
 */
const HUMAN = 'dana';
const SHIP = 'Ship it';

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

/** Only the two fields test 10's chain reads back off a resolved escalation. */
interface ResolvedEscalation {
  routed_to_id: string | null;
  resolved_by_id: string | null;
}

interface BlockedAgent {
  server: ServerProc;
  /** The parked `work_escalate` call: an agent waiting on a human answer. */
  escalated: Promise<unknown>;
  /** The form Slack would post for a tap on "Ship it", built from the delivered card. */
  form: string;
}

/**
 * Spawn the entrypoint, park an agent on a blocking escalation, and read back
 * the tap that answers it. All three tests need exactly this; only
 * `SLACK_SIGNING_SECRET` differs between them, and an explicit `undefined`
 * unsets it rather than inheriting an ambient one.
 */
async function arrangeBlockedAgent(
  signingSecret: string | undefined,
  key: string,
): Promise<BlockedAgent> {
  slack = await startSlackFake();
  const server = await startServerProc({
    env: {
      SLACK_SIGNING_SECRET: signingSecret,
      SLACK_WEBHOOK_URL: slack.webhookUrl,
      PURVIEW_HUMAN: HUMAN,
    },
  });
  proc = server;

  const agent = await mcp(server.baseUrl, 'scout');
  // Irreversible at low confidence: severity well above the digest band, so
  // the escalation is delivered as a card rather than held for a digest.
  const item = await call(agent, 'work_create', {
    intent: 'roll the release out to production',
    blast_radius: 'irreversible',
    idempotency_key: key,
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
        { id: 'ship', label: SHIP },
        { id: 'hold', label: 'Hold' },
      ],
      context_summary: 'Release is built and green; the deploy window closes in an hour.',
      blocking: true,
      timeout_seconds: 60,
    },
  });
  // Teardown closes the client, rejecting any still-parked call with nobody
  // awaiting it. Keep that from masking the real failure.
  void escalated.catch(() => undefined);

  const card = await slack.awaitPost((p) => p.url === '/webhook', {
    label: 'the escalation card at the fake Slack webhook',
  });
  // From the card, not the tool result: what a human taps is the identity the
  // route will be handed.
  const form = blockActionsForm({
    actionId: actionIdForOption(card.body, SHIP),
    userName: HUMAN,
    responseUrl: slack.responseUrl(key),
  });
  return { server, escalated, form };
}

it('rejects an unsigned interaction and leaves the agent blocked when SLACK_SIGNING_SECRET is set', async () => {
  const { server, escalated, form } = await arrangeBlockedAgent(SIGNING_SECRET, 'fq26-enforced');

  const rejected = await tap(server.baseUrl, form, { signed: false });
  // Unlike an accepted interaction, whose 200 is only an ack sent before any
  // work happens, this status *is* the outcome: the route returns 401 instead
  // of acknowledging, and does not read the payload at all.
  expect(rejected.status).toBe(401);

  // The status code alone would also pass against a route that answered 401
  // and applied the work anyway, so prove the non-release directly: the agent
  // is still parked.
  await stillPending(escalated, 250);

  // And prove the 401 was about the signature rather than a form this test
  // built wrong: the same bytes, signed, do release the agent.
  await tap(server.baseUrl, form, { signingSecret: SIGNING_SECRET });
  const outcome = toolJson(await escalated).outcome as Record<string, unknown>;
  expect(outcome).toMatchObject({ resolution: 'answered', chosen_option_id: 'ship' });
});

/**
 * CHARACTERIZATION, NOT ENDORSEMENT. `src/http/app.ts` skips signature
 * verification entirely when no secret is configured, so a deployment that
 * forgets `SLACK_SIGNING_SECRET` exposes an endpoint where anyone who can
 * reach the port may answer questions addressed to the accountable human —
 * and the transcript attributes those answers to that human. The process
 * starts clean and says nothing about it.
 *
 * The test below pins that behaviour as an explicit, undeniable fact so it
 * cannot be discovered by accident later. It does not assert that the
 * behaviour is correct. Whether the default should change is a separate
 * decision with its own blast radius, deliberately not made here and not made
 * by the FQ-3 spec. If it is changed, this test is expected to fail and should
 * be rewritten to the new behaviour rather than deleted.
 */
it('resolves an escalation from an unsigned interaction when SLACK_SIGNING_SECRET is unset', async () => {
  const { server, escalated, form } = await arrangeBlockedAgent(undefined, 'fq26-unenforced');

  await tap(server.baseUrl, form);

  const resolved = toolJson(await escalated);
  const outcome = resolved.outcome as Record<string, unknown>;
  expect(outcome).toMatchObject({ resolution: 'answered', chosen_option_id: 'ship' });
  // And the answer is credited to the accountable human, who did not send it.
  const escalation = resolved.escalation as ResolvedEscalation;
  expect(escalation.resolved_by_id).toBe(escalation.routed_to_id);
});

it('routes escalations to the human named by PURVIEW_HUMAN', async () => {
  const { server, escalated, form } = await arrangeBlockedAgent(SIGNING_SECRET, 'fq26-human');

  // Link 1, env -> service: the entrypoint's startup banner prints
  // `service.defaultHuman.display_name`, so a configured name appearing here
  // is the resolved principal and not an echo of the variable. This is the
  // only surface on which a principal's display name is observable at all —
  // no MCP tool lists principals, and `principal://{id}/queue` is keyed by id.
  await server.awaitStdout(`accountable human  ${HUMAN}`);

  await tap(server.baseUrl, form, { signingSecret: SIGNING_SECRET });
  const escalation = toolJson(await escalated).escalation as ResolvedEscalation;

  // Link 2, service -> routing -> resolution: the escalation was routed to the
  // same principal that a tap by that name resolved it as.
  //
  // Deliberately NOT a name lookup through `/slack/interactions`:
  // `src/http/app.ts` falls back to `service.defaultHuman` when no human
  // matches an interaction's `user_name`, so an assertion that a tap by "dana"
  // is credited to "dana" passes whether or not `PURVIEW_HUMAN` was honoured.
  // It cannot fail against the bug it exists to catch. The teeth are in link 1.
  expect(escalation.routed_to_id).toEqual(expect.any(String));
  expect(escalation.resolved_by_id).toBe(escalation.routed_to_id);
});
