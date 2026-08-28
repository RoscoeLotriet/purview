import { describe, expect, it } from 'vitest';
import { computeRollup, type RollupOwnInput } from '../src/domain/rollup.js';
import type { Rollup } from '../src/domain/types.js';

function own(overrides: Partial<RollupOwnInput> = {}): RollupOwnInput {
  return {
    state: 'running',
    blast_radius: 'none',
    consumed: {},
    budget: null,
    deadline: null,
    ...overrides,
  };
}

function childRollup(overrides: Partial<Rollup> = {}): Rollup {
  return {
    descendant_count: 0,
    open_count: 0,
    attention: null,
    worst_blast_radius: 'none',
    consumed: {},
    earliest_deadline: null,
    ...overrides,
  };
}

describe('rollup', () => {
  it('a leaf with no children and open state counts itself open, no attention', () => {
    const r = computeRollup(own(), []);
    expect(r).toEqual({
      descendant_count: 0,
      open_count: 1,
      attention: null,
      worst_blast_radius: 'none',
      consumed: {},
      earliest_deadline: null,
    });
  });

  it('surfaces own exceptional state as attention', () => {
    expect(computeRollup(own({ state: 'awaiting_approval' }), []).attention).toBe('approval');
    expect(computeRollup(own({ state: 'failed' }), []).attention).toBe('failed');
    expect(computeRollup(own({ state: 'blocked' }), []).attention).toBe('blocked');
  });

  it('punches child attention upward with precedence approval > failed > blocked > over_budget', () => {
    const failed = childRollup({ attention: 'failed', open_count: 1, descendant_count: 0 });
    const approval = childRollup({ attention: 'approval', open_count: 1 });
    const blocked = childRollup({ attention: 'blocked', open_count: 1 });
    expect(computeRollup(own(), [failed, approval]).attention).toBe('approval');
    expect(computeRollup(own(), [failed, blocked]).attention).toBe('failed');
    expect(computeRollup(own(), [blocked]).attention).toBe('blocked');
  });

  it('flags over_budget when summed consumption exceeds 90% of own budget', () => {
    const kids = [childRollup({ consumed: { usd: 5 } }), childRollup({ consumed: { usd: 4.2 } })];
    const r = computeRollup(own({ budget: { usd: 10 } }), kids);
    expect(r.attention).toBe('over_budget');
    expect(r.consumed).toEqual({ usd: 9.2 });
  });

  it('collapses to null attention when everything is closed', () => {
    const closedKid = childRollup({ open_count: 0, descendant_count: 2 });
    const r = computeRollup(own({ state: 'done' }), [closedKid]);
    expect(r.attention).toBeNull();
    expect(r.open_count).toBe(0);
    expect(r.descendant_count).toBe(3); // 1 child + its 2 descendants
  });

  it('takes worst blast radius and earliest deadline across the subtree', () => {
    const kids = [
      childRollup({ worst_blast_radius: 'costly', earliest_deadline: '2026-09-01T00:00:00.000Z' }),
      childRollup({ worst_blast_radius: 'reversible', earliest_deadline: '2026-08-30T00:00:00.000Z' }),
    ];
    const r = computeRollup(own({ blast_radius: 'none', deadline: '2026-09-15T00:00:00.000Z' }), kids);
    expect(r.worst_blast_radius).toBe('costly');
    expect(r.earliest_deadline).toBe('2026-08-30T00:00:00.000Z');
  });
});
