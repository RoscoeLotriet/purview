import { createHmac } from 'node:crypto';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/http/app.js';
import { PurviewService } from '../src/service/purview.js';
import { MemoryStore } from '../src/store/memory.js';

const SIGNING_SECRET = 'test-secret';

describe('HTTP app', () => {
  let store: MemoryStore;
  let service: PurviewService;
  let server: Server;
  let base: string;

  beforeEach(async () => {
    store = new MemoryStore();
    service = new PurviewService({ store, humanName: 'roscoe' });
    const app = buildApp(service, { signingSecret: SIGNING_SECRET });
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const address = server.address();
    if (typeof address === 'string' || address === null) throw new Error('no port');
    base = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    service.shutdown();
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  it('serves healthz', async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('answers MCP initialize and tool calls over streamable HTTP', async () => {
    const headers = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'x-purview-principal': 'scout',
    };
    const init = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test', version: '0' },
        },
      }),
    });
    expect(init.status).toBe(200);
    const initBody = (await init.json()) as { result: { serverInfo: { name: string } } };
    expect(initBody.result.serverInfo.name).toBe('purview');

    const call = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'work_create',
          arguments: { intent: 'via http', idempotency_key: 'h1' },
        },
      }),
    });
    expect(call.status).toBe(200);
    const callBody = (await call.json()) as {
      result: { content: Array<{ text: string }> };
    };
    const item = JSON.parse(callBody.result.content[0]!.text) as { created_by_id: string };
    const scout = store.findPrincipalByName('scout');
    expect(scout).toBeDefined();
    expect(item.created_by_id).toBe(scout!.id);
  });

  it('rejects GET on /mcp in stateless mode', async () => {
    const res = await fetch(`${base}/mcp`, { method: 'GET' });
    expect(res.status).toBe(405);
  });

  it('resolves an escalation from a signed Slack interaction', async () => {
    const human = service.defaultHuman;
    const agent = service.ensureAgent('scout');
    const item = service.createWork(
      { intent: 'risky', blast_radius: 'irreversible', idempotency_key: 'k' },
      human,
    );
    service.claim(item.id, 0, agent);
    const { escalation } = await service.escalate(
      {
        work_item_id: item.id,
        kind: 'approval',
        question: 'Go?',
        options: [{ id: 'go', label: 'Go' }],
        context_summary: 'ctx',
      },
      agent,
    );

    const payload = JSON.stringify({
      type: 'block_actions',
      user: { username: 'roscoe' },
      response_url: '',
      actions: [{ action_id: `resolve:${escalation.id}:go` }],
    });
    const rawBody = `payload=${encodeURIComponent(payload)}`;
    const ts = String(Math.floor(Date.now() / 1000));
    const hmac = createHmac('sha256', SIGNING_SECRET);
    hmac.update(`v0:${ts}:${rawBody}`);
    const signature = `v0=${hmac.digest('hex')}`;

    const res = await fetch(`${base}/slack/interactions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-slack-request-timestamp': ts,
        'x-slack-signature': signature,
      },
      body: rawBody,
    });
    expect(res.status).toBe(200);
    const resolved = store.getEscalation(escalation.id)!;
    expect(resolved.resolution).toBe('answered');
    expect(resolved.chosen_option_id).toBe('go');
    expect(resolved.resolved_by_id).toBe(human.id);
  });

  it('rejects an unsigned Slack interaction', async () => {
    const res = await fetch(`${base}/slack/interactions`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'payload=%7B%7D',
    });
    expect(res.status).toBe(401);
  });
});
