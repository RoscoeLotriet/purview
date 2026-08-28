import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../src/store/memory.js';
import { PurviewService } from '../src/service/purview.js';
import type { Principal } from '../src/domain/types.js';

describe('PurviewService work lifecycle', () => {
  let store: MemoryStore;
  let service: PurviewService;
  let human: Principal;
  let agent: Principal;

  beforeEach(() => {
    store = new MemoryStore();
    service = new PurviewService({ store, humanName: 'roscoe' });
    human = service.defaultHuman;
    agent = service.ensureAgent('scout');
  });

  it('seeds the default human and registers agents delegated by them', () => {
    expect(human.kind).toBe('human');
    expect(agent.kind).toBe('agent');
    expect(agent.delegated_by).toBe(human.id);
    expect(agent.delegation_depth).toBe(1);
    expect(service.ensureAgent('scout').id).toBe(agent.id); // stable across calls
  });

  it('creates a root item in ready with a single-segment path', () => {
    const item = service.createWork(
      { intent: 'Ship the Q3 report', priority: 0.8, budget: { usd: 50 }, idempotency_key: 'root-1' },
      human,
    );
    expect(item.state).toBe('ready');
    expect(item.parent_id).toBeNull();
    expect(item.root_id).toBe(item.id);
    expect(item.path).toMatch(/^[0-9a-f]{4}$/);
    expect(item.depth).toBe(0);
    expect(item.priority).toBe(0.8);
  });

  it('replays creation on the same idempotency key', () => {
    const a = service.createWork({ intent: 'x', idempotency_key: 'dup' }, human);
    const b = service.createWork({ intent: 'x', idempotency_key: 'dup' }, human);
    expect(b.id).toBe(a.id);
  });

  it('rejects creation without an idempotency key', () => {
    expect(() => service.createWork({ intent: 'x', idempotency_key: '' }, human)).toThrow(/idempotency/i);
  });

  it('nests children under the parent path and enforces budget narrowing', () => {
    const root = service.createWork(
      { intent: 'root', budget: { usd: 10 }, idempotency_key: 'r' },
      human,
    );
    const child = service.createWork(
      { parent_id: root.id, intent: 'child', budget: { usd: 6 }, idempotency_key: 'c1' },
      agent,
    );
    expect(child.path).toBe(`${root.path}.${child.path.split('.')[1]}`);
    expect(child.depth).toBe(1);
    expect(child.root_id).toBe(root.id);

    // remaining parent budget is 4; a 6-usd sibling must be rejected
    expect(() =>
      service.createWork({ parent_id: root.id, intent: 'too big', budget: { usd: 6 }, idempotency_key: 'c2' }, agent),
    ).toThrow(/budget/i);
  });

  it('fan_out is atomic: one oversubscribed child rejects the whole batch', () => {
    const root = service.createWork({ intent: 'root', budget: { usd: 10 }, idempotency_key: 'r' }, human);
    expect(() =>
      service.fanOut(
        root.id,
        [
          { intent: 'a', budget: { usd: 5 } },
          { intent: 'b', budget: { usd: 6 } },
        ],
        'fan-1',
        agent,
      ),
    ).toThrow(/budget/i);
    expect(store.children(root.id)).toHaveLength(0);

    const kids = service.fanOut(
      root.id,
      [
        { intent: 'a', budget: { usd: 5 } },
        { intent: 'b', budget: { usd: 5 } },
      ],
      'fan-2',
      agent,
    );
    expect(kids).toHaveLength(2);
    // replay returns the same children
    const replay = service.fanOut(root.id, [{ intent: 'a' }, { intent: 'b' }], 'fan-2', agent);
    expect(replay.map((k) => k.id)).toEqual(kids.map((k) => k.id));
  });

  it('claim moves ready → running, records owner and confidence', () => {
    const item = service.createWork({ intent: 'x', idempotency_key: 'r' }, human);
    const claimed = service.claim(item.id, 0.7, agent);
    expect(claimed.state).toBe('running');
    expect(claimed.owner_id).toBe(agent.id);
    expect(claimed.confidence).toBe(0.7);
    expect(claimed.started_at).not.toBeNull();
    expect(() => service.claim(item.id, 0.5, agent)).toThrow(/running/i);
  });

  it('setState enforces the transition table and the reason rule', () => {
    const item = service.createWork({ intent: 'x', idempotency_key: 'r' }, human);
    service.claim(item.id, null, agent);
    expect(() => service.setState(item.id, 'blocked', null, agent)).toThrow(/reason/i);
    const blocked = service.setState(item.id, 'blocked', 'waiting on DNS', agent);
    expect(blocked.state).toBe('blocked');
    expect(blocked.state_reason).toBe('waiting on DNS');
    expect(() => service.setState(item.id, 'done', null, agent)).toThrow(/transition/i);
  });

  it('report appends transcript entries and merges cost into consumed', () => {
    const item = service.createWork({ intent: 'x', budget: { usd: 10 }, idempotency_key: 'r' }, human);
    service.claim(item.id, null, agent);
    service.report(item.id, { kind: 'tool_call', body: 'ran tests', cost: { usd: 2 } }, agent);
    service.report(item.id, { kind: 'note', body: 'looking good' }, agent);
    const after = store.getWorkItem(item.id)!;
    expect(after.consumed).toEqual({ usd: 2 });
    expect(store.entries(item.id, ['tool_call'])).toHaveLength(1);
  });

  it('complete closes the item and rollup collapses; failure punches up through two levels', () => {
    const root = service.createWork({ intent: 'root', idempotency_key: 'r' }, human);
    const mid = service.createWork({ parent_id: root.id, intent: 'mid', idempotency_key: 'm' }, agent);
    const leafA = service.createWork({ parent_id: mid.id, intent: 'leaf a', idempotency_key: 'a' }, agent);
    const leafB = service.createWork({ parent_id: mid.id, intent: 'leaf b', idempotency_key: 'b' }, agent);

    service.claim(leafA.id, null, agent);
    service.complete(leafA.id, 'done fine', [], agent);
    expect(store.getWorkItem(root.id)!.rollup.attention).toBeNull();

    service.claim(leafB.id, null, agent);
    service.setState(leafB.id, 'failed', 'exploded', agent);
    expect(store.getWorkItem(mid.id)!.rollup.attention).toBe('failed');
    expect(store.getWorkItem(root.id)!.rollup.attention).toBe('failed');
    expect(store.getWorkItem(root.id)!.rollup.open_count).toBe(2); // root and mid stay open; both leaves are closed
  });

  it('attention-only query returns exactly the flagged paths', () => {
    const root = service.createWork({ intent: 'root', idempotency_key: 'r' }, human);
    const ok = service.createWork({ parent_id: root.id, intent: 'healthy', idempotency_key: 'h' }, agent);
    const bad = service.createWork({ parent_id: root.id, intent: 'doomed', idempotency_key: 'd' }, agent);
    service.claim(ok.id, null, agent);
    service.claim(bad.id, null, agent);
    service.setState(bad.id, 'failed', 'no', agent);

    const view = service.query({ work_item_id: root.id, attention_only: true });
    const ids = view.items.map((i) => i.id).sort();
    expect(ids).toEqual([bad.id, root.id].sort());
  });

  it('personal queue query returns owned items and open escalations', () => {
    const item = service.createWork({ intent: 'x', idempotency_key: 'r' }, human);
    service.claim(item.id, null, agent);
    const q = service.query({ principal_id: agent.id });
    expect(q.items.map((i) => i.id)).toEqual([item.id]);
    expect(q.escalations).toEqual([]);
  });
});
