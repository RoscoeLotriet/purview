import { afterEach, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { probeFreePort } from './harness/ports.js';
import { startServerProc, type ServerProc } from './harness/server-proc.js';

/**
 * Gap 6, test 25 — the restart boundary (docs/factory/specs/FQ-3/03-design.md).
 *
 * **This test is a tripwire, not a defect detector.** It asserts that v0 loses
 * everything on restart, which is not a bug: `src/server.ts` constructs a
 * `MemoryStore` and the product documents non-durability as a stated v0 limit.
 * Its whole value is that a durable store — the Postgres adapter, or anything
 * else that survives a process boundary — cannot land without someone
 * *deliberately* coming here and inverting it. If you are reading this because
 * it just went red: check whether persistence was the point of your change. If
 * it was, this test has done its job and the assertion below should be flipped
 * to expect the item to still be there. If it was not, you have accidentally
 * made state outlive a process and that is the bug.
 *
 * It is deliberately the expensive version. The cheap in-process equivalent —
 * two `PurviewService` instances over two stores — is tautological and proves
 * nothing about the deployed process; the design doc rejected it on those
 * grounds. So this drives the real entrypoint through a full stop/start cycle.
 */

/** No Slack anywhere: this test is about the store, not the bridge. */
const ENV = { SLACK_SIGNING_SECRET: undefined, SLACK_WEBHOOK_URL: undefined };

let procs: ServerProc[] = [];
let clients: Client[] = [];

afterEach(async () => {
  for (const client of clients) await client.close();
  clients = [];
  // Runs even when the test threw: a child left running holds the port for the
  // rest of the session, and this file pins its port rather than probing.
  for (const proc of procs) await proc.stop();
  procs = [];
});

async function start(port: number): Promise<ServerProc> {
  const proc = await startServerProc({ env: ENV, port });
  procs.push(proc);
  return proc;
}

async function mcp(baseUrl: string): Promise<Client> {
  const client = new Client({ name: 'purview-integration', version: '0.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
      requestInit: { headers: { 'x-purview-principal': 'scout' } },
    }),
  );
  clients.push(client);
  return client;
}

/**
 * Every tool result is one text block holding JSON. Parsing it here keeps the
 * test on the wire surface.
 */
function toolJson(result: unknown): Record<string, unknown> {
  const { content, isError } = result as { content?: Array<{ text?: string }>; isError?: boolean };
  const text = content?.[0]?.text;
  if (isError) throw new Error(`tool call failed: ${text ?? 'no detail'}`);
  if (!text) throw new Error('tool result carried no text content');
  return JSON.parse(text) as Record<string, unknown>;
}

/** The `workitem://{id}` resource, parsed. Rejects if the item is unknown. */
async function readItem(client: Client, workItemId: string): Promise<Record<string, unknown>> {
  const read = await client.readResource({ uri: `workitem://${workItemId}` });
  const [entry] = read.contents;
  if (!entry || !('text' in entry)) throw new Error('resource read returned no text content');
  const { item } = JSON.parse(entry.text as string) as { item?: Record<string, unknown> };
  if (!item) throw new Error(`resource read returned no item for ${workItemId}`);
  return item;
}

it('loses work created before SIGTERM when the entrypoint restarts on the same port', async () => {
  // Probed once and pinned for both starts. "On the same port" is half the
  // claim: a second probe could hand back a different port, and the test would
  // still pass — for the wrong reason, having proved only that a fresh server
  // elsewhere does not know about this item.
  const port = await probeFreePort();

  const first = await start(port);
  const before = await mcp(first.baseUrl);
  const created = toolJson(
    await before.callTool({
      name: 'work_create',
      arguments: {
        intent: 'draft the migration plan',
        blast_radius: 'reversible',
        idempotency_key: 'fq10-restart-boundary',
      },
    }),
  );
  const workItemId = created.id as string;

  // Read it back over the wire *through the same resource the post-restart
  // assertion uses*. Without this the absence below would also be satisfied by
  // a create that never landed or a read path that is simply broken — the
  // failure mode that makes an assert-a-negative test worthless.
  expect(await readItem(before, workItemId)).toMatchObject({ id: workItemId });

  // Close the client before the signal: an open keep-alive socket keeps
  // `server.close()` from completing, and the harness would fall through to its
  // SIGKILL escape hatch, reporting a null exit code instead of a clean 0.
  await before.close();
  await first.stop();
  expect(first.exitCode).toBe(0);

  // A pinned port gets no EADDRINUSE retry from the harness, so this start is
  // itself the proof that the first process released the port on SIGTERM.
  const second = await start(port);
  expect(second.port).toBe(port);
  const after = await mcp(second.baseUrl);

  // The tripwire. `unknown work item` rather than a bare rejection: the item is
  // gone because the store never knew it, not because the read failed.
  await expect(readItem(after, workItemId)).rejects.toThrow(/unknown work item/);
});
