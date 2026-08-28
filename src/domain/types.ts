// Domain types for Purview. Normative source: docs/spec/purview-spec.md §1.
// `spec` stays in the schema but is unused by any v1 surface (product spec D4).
// Strict tree, no cross-links (product spec D5).

export type PrincipalId = string;
export type WorkItemId = string;
export type EscalationId = string;
export type EntryId = string;
/** Dotted 4-hex segments, e.g. `3f2a.9c11.04d7`. Maps to Postgres ltree. */
export type MaterialisedPath = string;
export type Timestamp = string; // ISO 8601, UTC
export type Json = unknown;

// ---------------------------------------------------------------------------
// Principal
// ---------------------------------------------------------------------------

export type PrincipalKind = 'human' | 'agent' | 'service';

export type Capability = string; // e.g. 'repo:write', 'spend:usd:500', 'prod:deploy'

export type Channel = 'in-app' | 'slack' | 'push' | 'sms';

export interface TimeWindow {
  /** 'HH:MM' 24h, in the profile's timezone. A window may wrap midnight. */
  start: string;
  end: string;
}

export interface AttentionProfile {
  interrupts_per_hour: number;
  quiet_hours: TimeWindow[];
  timezone: string;
  escalation_channels: Channel[];
  auto_delegate_to: PrincipalId | null;
}

export interface Principal {
  id: PrincipalId;
  kind: PrincipalKind;
  display_name: string;
  /** Chain must terminate at a human. Recorded on every action. */
  delegated_by: PrincipalId | null;
  delegation_depth: number;
  /** An agent can never hold capabilities its delegator lacks. */
  capabilities: Capability[];
  /** Humans only. */
  attention: AttentionProfile | null;
  created_at: Timestamp;
  /** Kill switch; cascades to delegates. */
  revoked_at: Timestamp | null;
}

// ---------------------------------------------------------------------------
// WorkItem
// ---------------------------------------------------------------------------

export type WorkState =
  | 'proposed'
  | 'ready'
  | 'running'
  | 'blocked'
  | 'awaiting_approval'
  | 'done'
  | 'failed'
  | 'abandoned';

export type BlastRadius = 'none' | 'reversible' | 'costly' | 'irreversible';

export interface Budget {
  tokens?: number;
  usd?: number;
  wall_clock_seconds?: number;
  tool_calls?: number;
}

export interface StructuredSpec {
  acceptance_criteria: string[];
}

export interface ArtifactRef {
  kind: string; // 'file' | 'url' | 'text' | ...
  uri: string | null;
  label: string;
}

export interface ContextRef {
  uri: string;
  digest: string | null;
}

export type AttentionFlag = 'approval' | 'blocked' | 'failed' | 'over_budget';

export interface Rollup {
  descendant_count: number;
  open_count: number;
  /** The only thing that punches upward. */
  attention: AttentionFlag | null;
  worst_blast_radius: BlastRadius;
  /** Summed across subtree. */
  consumed: Budget;
  earliest_deadline: Timestamp | null;
}

export interface WorkItem {
  id: WorkItemId;

  // --- tree ---
  parent_id: WorkItemId | null;
  root_id: WorkItemId;
  path: MaterialisedPath;
  depth: number;

  // --- what ---
  /** Immutable natural-language goal. */
  intent: string;
  /** Mutable acceptance criteria. Unused by v1 surfaces (D4). */
  spec: StructuredSpec | null;
  labels: string[];

  // --- who ---
  owner_id: PrincipalId | null;
  created_by_id: PrincipalId;

  // --- state ---
  state: WorkState;
  /** Required for blocked | failed | abandoned. */
  state_reason: string | null;
  rollup: Rollup;

  // --- risk & cost ---
  blast_radius: BlastRadius;
  /** 0..1, agent self-reported at claim time. */
  confidence: number | null;
  /** Human-assigned on the root (0..1); feeds severity as root_priority. */
  priority: number;
  /** Inherited-and-narrowed from parent. */
  budget: Budget | null;
  consumed: Budget;

  // --- outputs & evidence ---
  artifacts: ArtifactRef[];
  provenance: ContextRef[];

  // --- time ---
  created_at: Timestamp;
  started_at: Timestamp | null;
  closed_at: Timestamp | null;
  deadline: Timestamp | null;

  /** Agents retry; creation must be safe. */
  idempotency_key: string | null;
}

// ---------------------------------------------------------------------------
// Transcript
// ---------------------------------------------------------------------------

export type EntryKind =
  | 'note'
  | 'state_change'
  | 'tool_call'
  | 'artifact'
  | 'escalation'
  | 'decision';

export interface TranscriptEntry {
  id: EntryId;
  work_item_id: WorkItemId;
  /** Monotonic per item. */
  seq: number;
  kind: EntryKind;
  author_id: PrincipalId;
  body: string;
  payload: Json | null;
  /** Hash of the context window at this point; snapshot lives in blob storage. */
  context_digest: string | null;
  created_at: Timestamp;
}

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

export type EscalationKind = 'approval' | 'decision' | 'input' | 'exception';

export interface EscalationOption {
  id: string;
  label: string;
}

export type RoutingBand = 'immediate' | 'digest' | 'queued';

export type TimeoutAction = 'abort' | 'proceed' | 'escalate_up' | 'fallback_owner';

export type EscalationResolution = 'answered' | 'timed_out' | 'withdrawn';

export interface Escalation {
  id: EscalationId;
  work_item_id: WorkItemId;
  kind: EscalationKind;
  raised_by_id: PrincipalId;

  question: string;
  /** >= 1 for approval/decision, <= 5 always. */
  options: EscalationOption[];
  /** <= 280 chars; must render on a phone. */
  context_summary: string;

  /** 0..1, computed server-side. Agents do not declare their own urgency. */
  severity: number;
  routed_to_id: PrincipalId | null;
  routing: RoutingBand;

  /** Determinism for the agent: what happens if nobody answers. */
  timeout_at: Timestamp;
  timeout_action: TimeoutAction;

  created_at: Timestamp;
  resolved_at: Timestamp | null;
  resolved_by_id: PrincipalId | null;
  resolution: EscalationResolution | null;
  chosen_option_id: string | null;
  free_text: string | null;
}
