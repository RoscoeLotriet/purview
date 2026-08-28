import { describe, expect, it } from 'vitest';
import { addBudget, fitsWithin, isOverBudget, remainingBudget } from '../src/domain/budget.js';

describe('budget arithmetic', () => {
  it('adds per-dimension, treating absent as 0', () => {
    expect(addBudget({ usd: 5, tokens: 100 }, { usd: 2, tool_calls: 3 })).toEqual({
      usd: 7,
      tokens: 100,
      tool_calls: 3,
    });
    expect(addBudget({}, {})).toEqual({});
  });

  it('computes remaining, flooring at zero', () => {
    expect(remainingBudget({ usd: 10, tokens: 500 }, { usd: 12, tokens: 100 })).toEqual({
      usd: 0,
      tokens: 400,
    });
  });

  it('fitsWithin checks only dimensions the parent bounds', () => {
    // Parent bounds usd only; child asking for tokens is fine.
    expect(fitsWithin({ tokens: 1_000_000 }, { usd: 10 })).toBe(true);
    expect(fitsWithin({ usd: 10 }, { usd: 10 })).toBe(true);
    expect(fitsWithin({ usd: 11 }, { usd: 10 })).toBe(false);
    expect(fitsWithin({ usd: 5, wall_clock_seconds: 60 }, { usd: 10, wall_clock_seconds: 30 })).toBe(false);
    expect(fitsWithin({}, { usd: 0 })).toBe(true);
  });

  it('isOverBudget triggers past 90% of any bounded dimension', () => {
    expect(isOverBudget({ usd: 9 }, { usd: 10 })).toBe(false); // exactly 0.9 is not over
    expect(isOverBudget({ usd: 9.01 }, { usd: 10 })).toBe(true);
    expect(isOverBudget({ tokens: 91, usd: 1 }, { tokens: 100 })).toBe(true);
    expect(isOverBudget({ usd: 100 }, {})).toBe(false); // nothing bounded
    expect(isOverBudget({ usd: 100 }, null)).toBe(false);
  });
});
