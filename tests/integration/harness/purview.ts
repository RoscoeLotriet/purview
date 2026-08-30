import { createServer, type Server } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { buildApp } from '../../../src/http/app.js';
import { PurviewService } from '../../../src/service/purview.js';
import { SlackBridge } from '../../../src/slack/bridge.js';
import { MemoryStore } from '../../../src/store/memory.js';

export const DEFAULT_SIGNING_SECRET = 'integration-signing-secret';
export const DEFAULT_HUMAN = 'roscoe';

/**
 * The only thing this harness needs from a Slack fake: somewhere to deliver
 * cards to.
 *
 * Declared structurally rather than imported. Gate 3 amendment 1 specifies
 * `slack?: SlackFake` "imported as a type only", but `SlackFake` lives in
 * `slack-fake.ts`, which lands in slice 0b — and a type-only import still
 * needs the module to resolve, so that spelling would not typecheck here.
 * A structural type reaches the amendment's stated goal exactly: the fake is
 * injected, and this module depends on `slack-fake.ts` neither at runtime nor
 * at compile time. Slice 0b's `SlackFake` satisfies this by shape, with no
 * import in either direction.
 */
export interface SlackTarget {
  readonly webhookUrl: string;
}

export interface HarnessOptions {
  humanName?: string;
  /** Explicit `undefined` selects the unenforced deployment; omitted means the default secret. */
  signingSecret?: string | undefined;
  /**
   * Where escalation cards are delivered. Omit for the log-only deployment: no
   * `SlackBridge` is constructed at all, which is a supported configuration
   * (test 9) and the one slice 0a exercises. Injected rather than started here
   * so this module owns no part of the fake's lifecycle.
   */
  slack?: SlackTarget;
}

export interface PurviewHarness {
  readonly baseUrl: string;
  /** Present only when one was injected. */
  readonly slack: SlackTarget | undefined;
  /** A connected MCP client identifying as `principal`. Tracked for teardown. */
  mcp(principal: string): Promise<Client>;
  /**
   * Closes clients, calls `service.shutdown()` (real timers), closes the
   * listener. Does **not** close an injected Slack fake — whoever starts one
   * closes it.
   */
  close(): Promise<void>;
}

function listen(server: Server): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (typeof address === 'string' || address === null) {
        reject(new Error('purview harness: listener reported no port'));
        return;
      }
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

/**
 * Stands the whole system up in process: MemoryStore -> SlackBridge ->
 * PurviewService -> buildApp, on a real socket. The deployment itself is still
 * stood in for by `buildApp`; slice 2 replaces that with the spawned entrypoint.
 */
export async function startHarness(opts: HarnessOptions = {}): Promise<PurviewHarness> {
  // `in` rather than `??`: passing `signingSecret: undefined` is how a caller
  // asks for the deployment that does not enforce signatures.
  const signingSecret = 'signingSecret' in opts ? opts.signingSecret : DEFAULT_SIGNING_SECRET;
  const slack = opts.slack;

  const store = new MemoryStore();
  const bridge = slack ? new SlackBridge({ webhookUrl: slack.webhookUrl }) : undefined;
  const service = new PurviewService({ store, bridge, humanName: opts.humanName ?? DEFAULT_HUMAN });
  const server = createServer(buildApp(service, { signingSecret, slackBridge: bridge }));
  const baseUrl = await listen(server);

  const clients: Client[] = [];

  return {
    baseUrl,
    slack,
    async mcp(principal: string): Promise<Client> {
      const client = new Client({ name: 'purview-integration', version: '0.0.0' });
      await client.connect(
        new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
          requestInit: { headers: { 'x-purview-principal': principal } },
        }),
      );
      clients.push(client);
      return client;
    },
    async close(): Promise<void> {
      for (const client of clients) await client.close();
      clients.length = 0;
      // Escalation timeouts are real timers; a leaked one hangs vitest.
      service.shutdown();
      const closed = new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
      server.closeAllConnections();
      await closed;
    },
  };
}
