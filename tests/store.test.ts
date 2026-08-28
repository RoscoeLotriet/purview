import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore } from '../src/store/memory.js';
import { emptyRollup } from '../src/domain/rollup.js';
import type { Escalation, Principal, WorkItem } from '../src/domain/types.js';

function principal(id: string, overrides: Partial<Principal> = {}): Principal {
  return {
    id,
    kind: 'agent',
    display_name: id,
    delegated_by: null,
    delegation_depth: 0,
    capabilities: [],
    attention: null,
    created_at: '2026-08-28T00:00:00.000Z',
    revoked_at: null,
    ...overrides,
  };
}

function item(id: string, path: string, overrides: Partial<WorkItem> = {}): WorkItem {
  const depth = path.split('.').length - 1;
  return {
    id,
    parent_id: null,
    root_id: id,
    path,
    depth,
    intent: `intent ${id}`,
    spec: null,
    labels: [],
    owner_id: null,
    created_by_id: 'pr_creator',
    state: 'ready',
    state_reason: null,
    rollup: emptyRollup({ state: 'ready', blast_radius: 'none', consumed: {}, budget: null, deadline: null }),
    blast_radius: 'none',
    confidence: null,
    priority: 0.5,
    budget: null,
    consumed: {},
    artifacts: [],
    provenance: [],
    created_at: '2026-08-28T00:00:00.000Z',
    started_at: null,
    closed_at: null,
    deadline: null,
    idempotency_key: null,
    ...overrides,
  };
}

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  it('finds principals by display name', () => {
    store.putPrincipal(principal('pr_a', { display_name: 'scout' }));
    expect(store.findPrincipalByName('scout')?.id).toBe('pr_a');
    expect(store.findPrincipalByName('nobody')).toBeUndefined();
  });

  it('looks up work items by idempotency key', () => {
    store.putWorkItem(item('wi_1', 'aaaa', { idempotency_key: 'k1' }));
    expect(store.getByIdempotencyKey('k1')?.id).toBe('wi_1');
    expect(store.getByIdempotencyKey('k2')).toBeUndefined();
  });

  it('returns a subtree by path prefix with a depth cap', () => {
    store.putWorkItem(item('wi_root', 'aaaa'));
    store.putWorkItem(item('wi_c1', 'aaaa.bbbb', { parent_id: 'wi_root', root_id: 'wi_root' }));
    store.putWorkItem(item('wi_g1', 'aaaa.bbbb.cccc', { parent_id: 'wi_c1', root_id: 'wi_root' }));
    store.putWorkItem(item('wi_other', 'aaab')); // sibling root, prefix 'aaa' must not match

    const all = store.subtree('aaaa');
    expect(all.map((i) => i.id).sort()).toEqual(['wi_c1', 'wi_g1', 'wi_root']);

    const shallow = store.subtree('aaaa', 1);
    expect(shallow.map((i) => i.id).sort()).toEqual(['wi_c1', 'wi_root']);
  });

  it('lists children of a parent', () => {
    store.putWorkItem(item('wi_root', 'aaaa'));
    store.putWorkItem(item('wi_c1', 'aaaa.bbbb', { parent_id: 'wi_root' }));
    store.putWorkItem(item('wi_c2', 'aaaa.cccc', { parent_id: 'wi_root' }));
    expect(store.children('wi_root').map((i) => i.id).sort()).toEqual(['wi_c1', 'wi_c2']);
  });

  it('assigns monotonic transcript seq per item', () => {
    store.putWorkItem(item('wi_1', 'aaaa'));
    store.putWorkItem(item('wi_2', 'bbbb'));
    const e1 = store.appendEntry({ work_item_id: 'wi_1', kind: 'note', author_id: 'pr_a', body: 'one', payload: null, context_digest: null });
    const e2 = store.appendEntry({ work_item_id: 'wi_1', kind: 'note', author_id: 'pr_a', body: 'two', payload: null, context_digest: null });
    const other = store.appendEntry({ work_item_id: 'wi_2', kind: 'note', author_id: 'pr_a', body: 'x', payload: null, context_digest: null });
    expect([e1.seq, e2.seq]).toEqual([1, 2]);
    expect(other.seq).toBe(1);
    expect(store.entries('wi_1').map((e) => e.body)).toEqual(['one', 'two']);
  });

  it('filters transcript entries by kind', () => {
    store.putWorkItem(item('wi_1', 'aaaa'));
    store.appendEntry({ work_item_id: 'wi_1', kind: 'note', author_id: 'pr_a', body: 'n', payload: null, context_digest: null });
    store.appendEntry({ work_item_id: 'wi_1', kind: 'tool_call', author_id: 'pr_a', body: 't', payload: null, context_digest: null });
    expect(store.entries('wi_1', ['note']).map((e) => e.kind)).toEqual(['note']);
  });

  it('lists open escalations for a principal', () => {
    const esc = (id: string, routed: string | null, resolved: boolean): Escalation => ({
      id,
      work_item_id: 'wi_1',
      kind: 'approval',
      raised_by_id: 'pr_agent',
      question: 'q',
      options: [{ id: 'yes', label: 'Yes' }],
      context_summary: 'ctx',
      severity: 0.5,
      routed_to_id: routed,
      routing: 'queued',
      timeout_at: '2026-08-28T01:00:00.000Z',
      timeout_action: 'abort',
      created_at: '2026-08-28T00:00:00.000Z',
      resolved_at: resolved ? '2026-08-28T00:30:00.000Z' : null,
      resolved_by_id: null,
      resolution: resolved ? 'answered' : null,
      chosen_option_id: null,
      free_text: null,
    });
    store.putEscalation(esc('esc_1', 'pr_h', false));
    store.putEscalation(esc('esc_2', 'pr_h', true));
    store.putEscalation(esc('esc_3', 'pr_other', false));
    expect(store.openEscalationsFor('pr_h').map((e) => e.id)).toEqual(['esc_1']);
    expect(store.openEscalations().map((e) => e.id).sort()).toEqual(['esc_1', 'esc_3']);
  });
});
