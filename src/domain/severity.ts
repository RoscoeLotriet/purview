import type { AttentionProfile, BlastRadius, RoutingBand } from './types.js';

/**
 * Placeholder weights (spec §3 and product spec §9: these are guessed and the
 * escalation-precision metric is what tunes them). They must sum to 1 so
 * severity stays in 0..1.
 */
export const SEVERITY_WEIGHTS = {
  blast: 0.4,
  confidence: 0.2,
  deadline: 0.2,
  priority: 0.2,
} as const;

export const IMMEDIATE_THRESHOLD = 0.7;
export const QUEUED_THRESHOLD = 0.4;

const BLAST_SCORE: Record<BlastRadius, number> = {
  none: 0,
  reversible: 1 / 3,
  costly: 2 / 3,
  irreversible: 1,
};

export interface SeverityInput {
  blast_radius: BlastRadius;
  /** Agent self-reported at claim time; null reads as 0.5. */
  confidence: number | null;
  /** Earliest deadline in scope (own, else root). */
  deadline: Date | null;
  now: Date;
  /** Human-assigned priority on the root item, 0..1. */
  root_priority: number;
}

/** Sigmoid on hours remaining: ~1 when past due, ~0.5 at 24h out, ~0 beyond a week. */
export function deadlinePressure(deadline: Date | null, now: Date): number {
  if (!deadline) return 0;
  const hoursLeft = (deadline.getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft <= 0) return 1;
  return 1 / (1 + Math.exp((hoursLeft - 24) / 8));
}

/** Computed server-side; agents do not get to declare their own urgency. */
export function computeSeverity(i: SeverityInput): number {
  const confidence = i.confidence ?? 0.5;
  const s =
    SEVERITY_WEIGHTS.blast * BLAST_SCORE[i.blast_radius] +
    SEVERITY_WEIGHTS.confidence * (1 - confidence) +
    SEVERITY_WEIGHTS.deadline * deadlinePressure(i.deadline, i.now) +
    SEVERITY_WEIGHTS.priority * clamp01(i.root_priority);
  return clamp01(s);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Local 'HH:MM' for `now` in the profile's timezone. */
function localHHMM(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
}

export function isInQuietHours(profile: AttentionProfile, now: Date): boolean {
  if (profile.quiet_hours.length === 0) return false;
  const t = localHHMM(profile.timezone, now);
  return profile.quiet_hours.some(({ start, end }) =>
    start <= end ? t >= start && t < end : t >= start || t < end,
  );
}

export interface RoutingDecision {
  band: RoutingBand;
}

/**
 * Spec §3. Routing decides whether an escalation interrupts, never whether it
 * is visible: every escalation still lands in the owner's queue.
 */
export function routeEscalation(
  severity: number,
  owner: AttentionProfile | null,
  interruptsUsedThisHour: number,
  now: Date,
): RoutingDecision {
  if (severity >= IMMEDIATE_THRESHOLD) return { band: 'immediate' };
  if (severity >= QUEUED_THRESHOLD) {
    if (owner) {
      if (isInQuietHours(owner, now)) return { band: 'digest' };
      if (interruptsUsedThisHour >= owner.interrupts_per_hour) return { band: 'digest' };
    }
    return { band: 'queued' };
  }
  return { band: 'digest' };
}
