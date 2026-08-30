import { afterEach, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startServerProc, type ServerProc } from './harness/server-proc.js';
import { blockActionsForm } from './harness/sign.js';
import { startSlackFake, type SlackFake } from './harness/slack-fake.js';
import { tap } from './harness/tap.js';

/**
 * Gap 2, tests 6, 9 and 11 — the process lifecycle half of slice 2, split
 * from tests 7, 8 and 10 at the pre-agreed 400-line point (docs/factory/
 * specs/FQ-3/04-slices.md). Everything below drives the *real entrypoint*
 * (`src/server.ts`) spawned as a child process with a controlled environment,
 * rather than `buildApp` inside the test process. The thing under test is what
 * actually deploys: five env vars, three surfaces, and SIGTERM.
 */

const SIGNING_SECRET = 'bootstrap-signing-secret';
const HUMAN = 'avery';

let proc: ServerProc | undefined;
let slack: SlackFake | undefined;
let clients: Client[] = [];

afterEach(async () => {
  for (const client of clients) await client.close();
  clients = [];
  // vitest runs this even when the test threw, which is the point: a child left
  // running holds a port for the rest of the session.
  await proc?.stop();
  proc = undefined;
  await slack?.close();
  slack = undefined;
});

async function start(env: Record<string, string | undefined>): Promise<ServerProc> {
  proc = await startServerProc({ env });
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

/**
 * Every tool result is `jsonResult(...)`: one text block holding JSON. Parsing
 * it here keeps the test on the wire surface.
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

/** An irreversible item at low confidence: severity well above the digest band. */
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

function escalateBlocking(agent: Client, workItemId: string): Promise<unknown> {
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
      timeout_seconds: 60,
    },
  });
  // Teardown closes the client, rejecting any still-parked call with nobody
  // awaiting it. Keep that from masking the real failure.
  void escalated.catch(() => undefined);
  return escalated;
}

/**
 * The escalation id, read back off the item's transcript over the wire. Needed
 * only where there is no Slack card to read it from (test 9).
 *
 * This polls because the append is asynchronous relative to this reader, the
 * same way `SlackFake.awaitPost` does. It is not a retry papering over a flaky
 * entrypoint, which gate 3 forbids: the read is deterministic once the entry
 * exists, and a genuinely broken append fails here rather than passing late.
 * Hand-rolled rather than `awaitCondition`: that helper takes a synchronous
 * predicate, and reading a resource is a round trip.
 */
async function awaitEscalationId(agent: Client, workItemId: string): Promise<string> {
  const deadline = Date.now() + 5_000;
  for (;;) {
    const read = await agent.readResource({ uri: `workitem://${workItemId}` });
    const [entry] = read.contents;
    if (entry && 'text' in entry) {
      const { transcript } = JSON.parse(entry.text as string) as {
        transcript: Array<{ kind: string; payload?: { escalation_id?: string } }>;
      };
      const id = transcript.find((e) => e.kind === 'escalation')?.payload?.escalation_id;
      if (id) return id;
    }
    if (Date.now() >= deadline) {
      throw new Error(`timed out waiting for an escalation entry on ${workItemId}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

it('serves /healthz, /mcp and /slack/interactions from the real entrypoint on PORT', async () => {
  const server = await start({ SLACK_SIGNING_SECRET: undefined, SLACK_WEBHOOK_URL: undefined });

  const health = await fetch(`${server.baseUrl}/healthz`);
  expect(health.status).toBe(200);
  expect(await health.json()).toEqual({ ok: true });

  const agent = await mcp(server.baseUrl, 'scout');
  const item = await call(agent, 'work_create', {
    intent: 'roll the release out to production',
    blast_radius: 'reversible',
    idempotency_key: 'fq7-surfaces',
  });
  expect(item.id).toEqual(expect.any(String));

  // Unlike a *resolution*, mounting is exactly what a status code proves here:
  // an unmounted path would 404. The payload is deliberately not one of ours,
  // so nothing is asserted about work having been applied.
  const mounted = await tap(server.baseUrl, new URLSearchParams({ payload: '{}' }).toString());
  expect(mounted.status).toBe(200);
});

it('starts and still resolves escalations with SLACK_WEBHOOK_URL unset', async () => {
  // The fake is started only to give the interaction a reachable response_url.
  // `SLACK_WEBHOOK_URL` stays unset, so no card is ever delivered to it.
  slack = await startSlackFake();
  const server = await start({
    SLACK_SIGNING_SECRET: SIGNING_SECRET,
    SLACK_WEBHOOK_URL: undefined,
    PURVIEW_HUMAN: HUMAN,
  });
  await server.awaitStdout('SLACK_WEBHOOK_URL unset');

  const agent = await mcp(server.baseUrl, 'scout');
  const workItemId = await claimedItem(agent, 'fq7-log-only');
  const escalated = escalateBlocking(agent, workItemId);

  // No card to read the action_id off, so it comes from the transcript instead.
  const escalationId = await awaitEscalationId(agent, workItemId);
  const form = blockActionsForm({
    actionId: `resolve:${escalationId}:ship`,
    userName: HUMAN,
    responseUrl: slack.responseUrl('fq7-log-only'),
  });
  await tap(server.baseUrl, form, { signingSecret: SIGNING_SECRET });

  const outcome = toolJson(await escalated).outcome as Record<string, unknown>;
  expect(outcome).toMatchObject({ resolution: 'answered', chosen_option_id: 'ship' });

  // Log-only means log-only: the bridge printed the card rather than posting it.
  expect(slack.posts).toHaveLength(0);
  await server.awaitStdout('[slack:off]');
});

it('closes the listener and exits on SIGTERM', async () => {
  const server = await start({ SLACK_SIGNING_SECRET: undefined, SLACK_WEBHOOK_URL: undefined });
  const health = await fetch(`${server.baseUrl}/healthz`);
  expect(health.status).toBe(200);
  // Drain the body so the keep-alive socket is idle and `server.close()` can
  // finish; an in-flight response would hold shutdown open until SIGKILL.
  await health.json();

  await server.stop();

  // Exit code 0 comes from the handler's `server.close(() => process.exit(0))`.
  // A process killed by the default SIGTERM disposition, or by this harness's
  // SIGKILL escape hatch, would report null here instead.
  expect(server.exitCode).toBe(0);
  await expect(fetch(`${server.baseUrl}/healthz`)).rejects.toThrow();
});
