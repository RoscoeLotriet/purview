import { createServer, type IncomingMessage, type Server } from 'node:http';
import { awaitCondition, type WaitOptions } from './wait.js';

export interface RecordedPost {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  at: number;
}

export interface SlackFake {
  readonly origin: string;
  /** origin + "/webhook" */
  readonly webhookUrl: string;
  /** origin + "/response/<id>" */
  responseUrl(id?: string): string;
  /** Webhook deliveries: cards and digests. */
  readonly posts: readonly RecordedPost[];
  /** response_url deliveries: card replacements. */
  readonly responses: readonly RecordedPost[];
  /**
   * Next request to any route answers with `status`. Provokes the failure path
   * without touching src/.
   */
  failNext(status: number, body?: string): void;
  awaitPost(predicate?: (p: RecordedPost) => boolean, opts?: WaitOptions): Promise<RecordedPost>;
  awaitResponse(
    predicate?: (p: RecordedPost) => boolean,
    opts?: WaitOptions,
  ): Promise<RecordedPost>;
  /** Drains in-flight requests before closing. */
  close(): Promise<void>;
}

function headersOf(req: IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') out[key] = value;
    else if (Array.isArray(value)) out[key] = value.join(', ');
  }
  return out;
}

/** Slack posts JSON; keep the raw text when it is anything else so a test can see it. */
function parseBody(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function listen(server: Server): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (typeof address === 'string' || address === null) {
        reject(new Error('slack fake: listener reported no port'));
        return;
      }
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

/**
 * A real HTTP server standing in for Slack, so the bridge's outbound `fetch`
 * crosses a socket. Interception libraries were rejected in the architecture
 * gate precisely because they would not.
 */
export async function startSlackFake(): Promise<SlackFake> {
  const posts: RecordedPost[] = [];
  const responses: RecordedPost[] = [];
  let failure: { status: number; body: string } | undefined;
  let inFlight = 0;

  const server = createServer((req, res) => {
    inFlight += 1;
    void readBody(req)
      .then((raw) => {
        const record: RecordedPost = {
          url: req.url ?? '',
          headers: headersOf(req),
          body: parseBody(raw),
          at: Date.now(),
        };
        if (record.url.startsWith('/response')) responses.push(record);
        else posts.push(record);

        const fail = failure;
        failure = undefined;
        if (fail) res.writeHead(fail.status, { 'content-type': 'text/plain' }).end(fail.body);
        else res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
      })
      .finally(() => {
        inFlight -= 1;
      });
  });

  const origin = await listen(server);

  return {
    origin,
    webhookUrl: `${origin}/webhook`,
    responseUrl: (id = 'default') => `${origin}/response/${id}`,
    posts,
    responses,
    failNext(status, body = 'slack fake: induced failure') {
      failure = { status, body };
    },
    awaitPost: (predicate = () => true, opts) =>
      awaitCondition(() => posts.find((p) => predicate(p)), {
        label: 'a webhook delivery at the fake Slack',
        ...opts,
      }),
    awaitResponse: (predicate = () => true, opts) =>
      awaitCondition(() => responses.find((p) => predicate(p)), {
        label: 'a response_url delivery at the fake Slack',
        ...opts,
      }),
    async close() {
      await awaitCondition(() => inFlight === 0 || undefined, {
        label: 'the fake Slack to drain its in-flight requests',
      });
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    },
  };
}
