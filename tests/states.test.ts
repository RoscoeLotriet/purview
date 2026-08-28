import { describe, expect, it } from 'vitest';
import { canTransition, reasonRequired, WORK_STATES } from '../src/domain/states.js';

describe('work item state machine', () => {
  it('allows the happy path', () => {
    expect(canTransition('proposed', 'ready')).toBe(true);
    expect(canTransition('ready', 'running')).toBe(true);
    expect(canTransition('running', 'done')).toBe(true);
  });

  it('allows exception paths out of running', () => {
    expect(canTransition('running', 'blocked')).toBe(true);
    expect(canTransition('running', 'awaiting_approval')).toBe(true);
    expect(canTransition('running', 'failed')).toBe(true);
    expect(canTransition('blocked', 'running')).toBe(true);
    expect(canTransition('awaiting_approval', 'running')).toBe(true);
    expect(canTransition('awaiting_approval', 'failed')).toBe(true);
  });

  it('allows abandoning from any non-terminal state', () => {
    for (const from of ['proposed', 'ready', 'running', 'blocked', 'awaiting_approval'] as const) {
      expect(canTransition(from, 'abandoned')).toBe(true);
    }
  });

  it('rejects skipping claim and resurrecting terminal states', () => {
    expect(canTransition('proposed', 'running')).toBe(false);
    expect(canTransition('ready', 'done')).toBe(false);
    expect(canTransition('done', 'running')).toBe(false);
    expect(canTransition('failed', 'running')).toBe(false);
    expect(canTransition('abandoned', 'ready')).toBe(false);
  });

  it('rejects self-transitions', () => {
    for (const s of WORK_STATES) {
      expect(canTransition(s, s)).toBe(false);
    }
  });

  it('requires a reason for blocked, failed and abandoned', () => {
    expect(reasonRequired('blocked')).toBe(true);
    expect(reasonRequired('failed')).toBe(true);
    expect(reasonRequired('abandoned')).toBe(true);
    expect(reasonRequired('running')).toBe(false);
    expect(reasonRequired('done')).toBe(false);
  });
});
