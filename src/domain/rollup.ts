import { addBudget, isOverBudget } from './budget.js';
import type {
  AttentionFlag,
  BlastRadius,
  Budget,
  Rollup,
  Timestamp,
  WorkState,
} from './types.js';

export interface RollupOwnInput {
  state: WorkState;
  blast_radius: BlastRadius;
  consumed: Budget;
  budget: Budget | null;
  deadline: Timestamp | null;
}

const BLAST_ORDER: readonly BlastRadius[] = ['none', 'reversible', 'costly', 'irreversible'];

const CLOSED_STATES: readonly WorkState[] = ['done', 'failed', 'abandoned'];

function stateAttention(state: WorkState): AttentionFlag | null {
  if (state === 'awaiting_approval') return 'approval';
  if (state === 'failed') return 'failed';
  if (state === 'blocked') return 'blocked';
  return null;
}

/**
 * Spec §2. Computed on write and cached on the parent chain; recompute walks
 * upward along `path`, so cost is bounded by depth, not subtree size.
 *
 * Resolution order, first match wins:
 * approval > failed > blocked > over_budget > null.
 */
export function computeRollup(own: RollupOwnInput, children: readonly Rollup[]): Rollup {
  let descendant_count = 0;
  let open_count = CLOSED_STATES.includes(own.state) ? 0 : 1;
  let consumed = own.consumed;
  let worst = own.blast_radius;
  let earliest = own.deadline;
  const flags = new Set<AttentionFlag>();

  const ownFlag = stateAttention(own.state);
  if (ownFlag) flags.add(ownFlag);

  for (const child of children) {
    descendant_count += 1 + child.descendant_count;
    open_count += child.open_count;
    consumed = addBudget(consumed, child.consumed);
    if (BLAST_ORDER.indexOf(child.worst_blast_radius) > BLAST_ORDER.indexOf(worst)) {
      worst = child.worst_blast_radius;
    }
    if (child.earliest_deadline && (!earliest || child.earliest_deadline < earliest)) {
      earliest = child.earliest_deadline;
    }
    if (child.attention) flags.add(child.attention);
  }

  if (isOverBudget(consumed, own.budget)) flags.add('over_budget');

  const attention: AttentionFlag | null = flags.has('approval')
    ? 'approval'
    : flags.has('failed')
      ? 'failed'
      : flags.has('blocked')
        ? 'blocked'
        : flags.has('over_budget')
          ? 'over_budget'
          : null;

  return {
    descendant_count,
    open_count,
    attention,
    worst_blast_radius: worst,
    consumed,
    earliest_deadline: earliest,
  };
}

export function emptyRollup(own: RollupOwnInput): Rollup {
  return computeRollup(own, []);
}
