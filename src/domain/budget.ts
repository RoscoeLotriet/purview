import type { Budget } from './types.js';

const DIMENSIONS = ['tokens', 'usd', 'wall_clock_seconds', 'tool_calls'] as const;
type Dimension = (typeof DIMENSIONS)[number];

export function addBudget(a: Budget, b: Budget): Budget {
  const out: Budget = {};
  for (const d of DIMENSIONS) {
    const sum = (a[d] ?? 0) + (b[d] ?? 0);
    if (a[d] !== undefined || b[d] !== undefined) out[d] = sum;
  }
  return out;
}

/** budget − consumed per bounded dimension, floored at zero. */
export function remainingBudget(budget: Budget, consumed: Budget): Budget {
  const out: Budget = {};
  for (const d of DIMENSIONS) {
    if (budget[d] !== undefined) out[d] = Math.max(0, budget[d] - (consumed[d] ?? 0));
  }
  return out;
}

/**
 * A child budget fits when every dimension the parent bounds is not exceeded.
 * Dimensions the parent leaves unbounded are unconstrained.
 */
export function fitsWithin(child: Budget, remaining: Budget): boolean {
  return DIMENSIONS.every((d) => {
    const cap = remaining[d];
    return cap === undefined || (child[d] ?? 0) <= cap;
  });
}

/** Over budget when consumption exceeds 90% of any bounded dimension (spec §2). */
export function isOverBudget(consumed: Budget, budget: Budget | null): boolean {
  if (!budget) return false;
  return DIMENSIONS.some((d) => {
    const cap = budget[d];
    return cap !== undefined && (consumed[d] ?? 0) > 0.9 * cap;
  });
}

function hasDimension(b: Budget, d: Dimension): boolean {
  return b[d] !== undefined;
}

/** True when the budget bounds nothing at all. */
export function isUnbounded(b: Budget | null): boolean {
  return !b || !DIMENSIONS.some((d) => hasDimension(b, d));
}
