import { describe, expect, it } from 'vitest';
import {
  computeSeverity,
  deadlinePressure,
  isInQuietHours,
  routeEscalation,
} from '../src/domain/severity.js';
import type { AttentionProfile } from '../src/domain/types.js';

const NOW = new Date('2026-08-28T12:00:00.000Z');

function profile(overrides: Partial<AttentionProfile> = {}): AttentionProfile {
  return {
    interrupts_per_hour: 4,
    quiet_hours: [],
    timezone: 'UTC',
    escalation_channels: ['slack'],
    auto_delegate_to: null,
    ...overrides,
  };
}

describe('computeSeverity', () => {
  it('is maximal for irreversible + zero confidence + past-due + top priority', () => {
    const s = computeSeverity({
      blast_radius: 'irreversible',
      confidence: 0,
      deadline: new Date('2026-08-27T12:00:00.000Z'),
      now: NOW,
      root_priority: 1,
    });
    expect(s).toBeCloseTo(1.0, 5);
  });

  it('is low for read-only confident work with no deadline', () => {
    const s = computeSeverity({
      blast_radius: 'none',
      confidence: 1,
      deadline: null,
      now: NOW,
      root_priority: 0,
    });
    expect(s).toBe(0);
  });

  it('treats null confidence as 0.5', () => {
    const withNull = computeSeverity({
      blast_radius: 'none',
      confidence: null,
      deadline: null,
      now: NOW,
      root_priority: 0,
    });
    expect(withNull).toBeCloseTo(0.2 * 0.5, 5);
  });

  it('irreversible blast alone crosses into the queued band', () => {
    const s = computeSeverity({
      blast_radius: 'irreversible',
      confidence: 1,
      deadline: null,
      now: NOW,
      root_priority: 0,
    });
    expect(s).toBeCloseTo(0.4, 5);
  });
});

describe('deadlinePressure', () => {
  it('is 0 with no deadline and 1 when past due', () => {
    expect(deadlinePressure(null, NOW)).toBe(0);
    expect(deadlinePressure(new Date('2026-08-28T11:00:00.000Z'), NOW)).toBe(1);
  });

  it('increases as the deadline approaches', () => {
    const far = deadlinePressure(new Date('2026-09-04T12:00:00.000Z'), NOW); // 7 days
    const near = deadlinePressure(new Date('2026-08-28T18:00:00.000Z'), NOW); // 6 hours
    expect(near).toBeGreaterThan(far);
    expect(near).toBeGreaterThan(0.5);
    expect(far).toBeLessThan(0.1);
  });
});

describe('isInQuietHours', () => {
  it('detects a window that wraps midnight', () => {
    const p = profile({ quiet_hours: [{ start: '22:00', end: '07:00' }], timezone: 'UTC' });
    expect(isInQuietHours(p, new Date('2026-08-28T23:30:00.000Z'))).toBe(true);
    expect(isInQuietHours(p, new Date('2026-08-28T06:30:00.000Z'))).toBe(true);
    expect(isInQuietHours(p, new Date('2026-08-28T12:00:00.000Z'))).toBe(false);
  });
});

describe('routeEscalation', () => {
  it('routes >= 0.7 immediate even in quiet hours with budget exhausted', () => {
    const owner = profile({ quiet_hours: [{ start: '00:00', end: '23:59' }] });
    expect(routeEscalation(0.75, owner, 99, NOW).band).toBe('immediate');
  });

  it('routes mid severity to queued while budget remains', () => {
    expect(routeEscalation(0.5, profile(), 0, NOW).band).toBe('queued');
    expect(routeEscalation(0.5, profile(), 3, NOW).band).toBe('queued');
  });

  it('demotes mid severity to digest when the hourly budget is spent', () => {
    expect(routeEscalation(0.5, profile(), 4, NOW).band).toBe('digest');
  });

  it('demotes mid severity to digest during quiet hours', () => {
    const owner = profile({ quiet_hours: [{ start: '11:00', end: '13:00' }] });
    expect(routeEscalation(0.5, owner, 0, NOW).band).toBe('digest');
  });

  it('routes < 0.4 to digest and copes with a null profile', () => {
    expect(routeEscalation(0.1, profile(), 0, NOW).band).toBe('digest');
    expect(routeEscalation(0.5, null, 0, NOW).band).toBe('queued');
  });
});
