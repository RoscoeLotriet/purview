import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildMcpServer } from '../src/mcp/server.js';
import { PurviewService } from '../src/service/purview.js';
import { MemoryStore } from '../src/store/memory.js';

interface ToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

function json(result: unknown): Record<string, unknown> {
  const r = result as ToolResult;
  const text = r.content.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('no text content in tool result');
  return JSON.parse(text) as Record<string, unknown>;
}

describe('MCP server', () => {
  let store: MemoryStore;
  let service: PurviewService;
  let client: Client;

  beforeEach(async () => {
    store = new MemoryStore();
    service = new PurviewService({ store, humanName: 'roscoe' });
    const server = buildMcpServer(service, 'scout');
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-agent', version: '0.0.1' });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  afterEach(async () => {
    await client.close();
    service.shutdown();
  });

  it('exposes the nine work tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'work_abandon',
        'work_claim',
        'work_complete',
        'work_create',
        'work_escalate',
        'work_fan_out',
        'work_query',
        'work_report',
        'work_set_state',
      ].sort(),
    );
  });

  it('drives a create → claim → report → complete round-trip', async () => {
    const created = json(
      await client.callTool({
        name: 'work_create',
        arguments: { intent: 'write the report', idempotency_key: 'k1' },
      }),
    );
    expect(created.state).toBe('ready');
    const id = created.id as string;

    const claimed = json(
      await client.callTool({ name: 'work_claim', arguments: { work_item_id: id, confidence: 0.9 } }),
    );
    expect(claimed.state).toBe('running');

    await client.callTool({
      name: 'work_report',
      arguments: { work_item_id: id, kind: 'tool_call', body: 'gathered data', cost: { usd: 1 } },
    });

    const completed = json(
      await client.callTool({ name: 'work_complete', arguments: { work_item_id: id, result: 'shipped' } }),
    );
    expect(completed.state).toBe('done');
    expect(store.getWorkItem(id)!.consumed).toEqual({ usd: 1 });
  });

  it('fans out children and queries the subtree', async () => {
    const root = json(
      await client.callTool({
        name: 'work_create',
        arguments: { intent: 'root goal', idempotency_key: 'root' },
      }),
    );
    const kids = json(
      await client.callTool({
        name: 'work_fan_out',
        arguments: {
          parent_id: root.id,
          children: [{ intent: 'a' }, { intent: 'b' }],
          idempotency_key: 'fan',
        },
      }),
    );
    expect((kids.items as unknown[]).length).toBe(2);

    const view = json(
      await client.callTool({ name: 'work_query', arguments: { work_item_id: root.id } }),
    );
    expect((view.items as unknown[]).length).toBe(3);
  });

  it('raises a non-blocking escalation and reads the queue resource', async () => {
    const created = json(
      await client.callTool({
        name: 'work_create',
        arguments: { intent: 'risky thing', blast_radius: 'irreversible', idempotency_key: 'r' },
      }),
    );
    await client.callTool({ name: 'work_claim', arguments: { work_item_id: created.id } });
    const esc = json(
      await client.callTool({
        name: 'work_escalate',
        arguments: {
          work_item_id: created.id,
          kind: 'approval',
          question: 'Proceed?',
          options: [{ id: 'go', label: 'Go' }],
          context_summary: 'ctx',
          blocking: false,
        },
      }),
    );
    expect((esc.escalation as { id: string }).id).toMatch(/^esc_/);

    const human = service.defaultHuman;
    const resource = await client.readResource({ uri: `principal://${human.id}/queue` });
    const body = JSON.parse((resource.contents[0] as { text: string }).text) as {
      escalations: unknown[];
    };
    expect(body.escalations).toHaveLength(1);
  });

  it('reads the item resource with transcript and the tree resource attention-only', async () => {
    const created = json(
      await client.callTool({
        name: 'work_create',
        arguments: { intent: 'observable', idempotency_key: 'o' },
      }),
    );
    const resource = await client.readResource({ uri: `workitem://${created.id}` });
    const body = JSON.parse((resource.contents[0] as { text: string }).text) as {
      item: { intent: string };
      transcript: unknown[];
    };
    expect(body.item.intent).toBe('observable');
    expect(body.transcript.length).toBeGreaterThan(0);

    const tree = await client.readResource({
      uri: `workitem://${created.id}/tree?depth=2&attention_only=true`,
    });
    const treeBody = JSON.parse((tree.contents[0] as { text: string }).text) as { items: unknown[] };
    expect(treeBody.items).toHaveLength(1); // just the (healthy) root itself
  });

  it('returns isError with the reason instead of crashing the agent', async () => {
    const created = json(
      await client.callTool({
        name: 'work_create',
        arguments: { intent: 'x', idempotency_key: 'e' },
      }),
    );
    const result = (await client.callTool({
      name: 'work_set_state',
      arguments: { work_item_id: created.id, state: 'done' },
    })) as ToolResult;
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/transition/i);
  });
});
