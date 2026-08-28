import type { WorkState } from './types.js';

export const WORK_STATES: readonly WorkState[] = [
  'proposed',
  'ready',
  'running',
  'blocked',
  'awaiting_approval',
  'done',
  'failed',
  'abandoned',
] as const;

/** Legal transitions. Terminal states (done, failed, abandoned) have no exits. */
const TRANSITIONS: Record<WorkState, readonly WorkState[]> = {
  proposed: ['ready', 'abandoned'],
  ready: ['running', 'abandoned'],
  running: ['blocked', 'awaiting_approval', 'done', 'failed', 'abandoned'],
  blocked: ['running', 'failed', 'abandoned'],
  awaiting_approval: ['running', 'failed', 'abandoned'],
  done: [],
  failed: [],
  abandoned: [],
};

export function canTransition(from: WorkState, to: WorkState): boolean {
  return TRANSITIONS[from].includes(to);
}

/** States whose entry requires a `state_reason`. */
export function reasonRequired(state: WorkState): boolean {
  return state === 'blocked' || state === 'failed' || state === 'abandoned';
}
