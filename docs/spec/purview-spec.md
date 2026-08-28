# Purview — Schema & MCP Surface

Draft v0.1

Design premise: work state is a byproduct of agent execution, not a chore performed
by humans after the fact. Agents are already calling an API to do the work; that call
*is* the state update. The read surface exists to make a machine-speed work graph
legible to humans with finite attention.

Three invariants everything else follows from:

1. **Intent is stable, plan is not.** An item's goal is written once. Its
   decomposition is rewritten freely by whoever owns it.
2. **Success collapses, exceptions punch up.** A parent hides completed children and
   surfaces only blocked, failed, over-budget or approval-pending descendants.
3. **Attention is a governed resource.** Escalation is scheduled against a budget, not
   fired at will.

---

## 1. Data model

### 1.1 Principal

Humans and agents are the same kind of thing. This is what makes ownership,
delegation and audit uniform.

```ts
type PrincipalKind = 'human' | 'agent' | 'service';

interface Principal {
  id: PrincipalId;
  kind: PrincipalKind;
  display_name: string;

  // Agents only. The human (or agent) whose authority this principal acts under.
  // Chain must terminate at a human. Recorded on every action.
  delegated_by: PrincipalId | null;
  delegation_depth: number;          // enforce a ceiling; runaway recursion is real

  // Capability grant. An agent can never hold capabilities its delegator lacks.
  capabilities: Capability[];        // e.g. 'repo:write', 'spend:usd:500', 'prod:deploy'

  // Humans only.
  attention: AttentionProfile | null;

  created_at: Timestamp;
  revoked_at: Timestamp | null;      // kill switch; cascades to delegates
}

interface AttentionProfile {
  interrupts_per_hour: number;       // soft budget, default 4
  quiet_hours: TimeWindow[];         // tz-aware
  timezone: string;
  escalation_channels: Channel[];    // ordered: in-app, slack, push, sms
  auto_delegate_to: PrincipalId | null;  // fallback when unavailable
}
```

**Note.** `delegated_by` plus `capabilities` is the whole governance story in two
fields. An agent spawning a sub-agent produces a narrowing chain — never widening.
Revoking a human revokes every agent operating under them, transitively.

---

### 1.2 WorkItem

The core object.

```ts
type WorkState =
  | 'proposed'          // exists, not yet accepted
  | 'ready'             // accepted, unclaimed
  | 'running'           // owner actively executing
  | 'blocked'           // needs something external
  | 'awaiting_approval' // gated on a human decision
  | 'done'
  | 'failed'
  | 'abandoned';

type BlastRadius =
  | 'none'          // read-only, no side effects
  | 'reversible'    // side effects, cheaply undone
  | 'costly'        // undoable but expensive or slow
  | 'irreversible'; // external send, payment, deletion, prod mutation

interface WorkItem {
  id: WorkItemId;

  // --- tree ---
  parent_id: WorkItemId | null;
  root_id: WorkItemId;              // denormalised: cheap "all work under this goal"
  path: MaterialisedPath;           // e.g. '3f2a.9c11.04d7' — ltree / prefix index
  depth: number;

  // --- what ---
  intent: string;                   // immutable natural-language goal
  spec: StructuredSpec | null;      // mutable acceptance criteria
  labels: string[];

  // --- who ---
  owner_id: PrincipalId | null;
  created_by_id: PrincipalId;

  // --- state ---
  state: WorkState;
  state_reason: string | null;      // required for blocked | failed | abandoned
  rollup: Rollup;                   // derived, see §2

  // --- risk & cost ---
  blast_radius: BlastRadius;
  confidence: number | null;        // 0..1, agent self-reported at claim time
  budget: Budget | null;            // inherited-and-narrowed from parent
  consumed: Budget;

  // --- outputs & evidence ---
  artifacts: ArtifactRef[];
  provenance: ContextRef[];         // what the owner read before deciding

  // --- time ---
  created_at: Timestamp;
  started_at: Timestamp | null;
  closed_at: Timestamp | null;
  deadline: Timestamp | null;

  idempotency_key: string | null;   // agents retry; creation must be safe
}

interface Budget {
  tokens?: number;
  usd?: number;
  wall_clock_seconds?: number;
  tool_calls?: number;
}
```

**Materialised path, not recursive CTE.** Altitude control is a read-path problem and
fan-out produces deep, wide trees. `WHERE path <@ :root AND depth <= :n` on a GiST
index answers "show me this goal at depth 3" in one indexed scan. Recursive traversal
per render will not survive machine-speed writes.

**`budget` narrows downward and is enforced server-side.** A `fan_out` that would
oversubscribe the parent's remaining budget is rejected. This is the primary lever
against runaway spend, and it belongs in the service, not in agent prompting.

---

### 1.3 Transcript

Append-only. The conversation is derived from this, not the other way round. This is
what makes replay possible.

```ts
type EntryKind =
  | 'note'          // free text from any principal
  | 'state_change'
  | 'tool_call'     // what the agent actually did
  | 'artifact'
  | 'escalation'
  | 'decision';     // human judgement, with the options they were shown

interface TranscriptEntry {
  id: EntryId;
  work_item_id: WorkItemId;
  seq: number;                      // monotonic per item
  kind: EntryKind;
  author_id: PrincipalId;
  body: string;
  payload: Json | null;
  context_digest: string | null;    // hash of the context window at this point
  created_at: Timestamp;
}
```

`context_digest` is what lets you answer "what did it know when it decided that."
Store the digest inline, the full snapshot in blob storage on a retention clock.

---

### 1.4 Escalation

A typed request for human attention. The important part is that it carries the
answer options, so responding is one tap rather than an essay.

```ts
type EscalationKind =
  | 'approval'      // may I proceed
  | 'decision'      // which of these
  | 'input'         // I need a value I cannot obtain
  | 'exception';    // FYI, I have failed or stopped

interface Escalation {
  id: EscalationId;
  work_item_id: WorkItemId;
  kind: EscalationKind;
  raised_by_id: PrincipalId;

  question: string;
  options: EscalationOption[];      // >= 1 for approval/decision
  context_summary: string;          // <= 280 chars, must render on a phone

  severity: number;                 // 0..1, computed — see §3
  routed_to_id: PrincipalId | null;
  routing: 'immediate' | 'digest' | 'queued';

  // Determinism for the agent: what happens if nobody answers.
  timeout_at: Timestamp;
  timeout_action: 'abort' | 'proceed' | 'escalate_up' | 'fallback_owner';

  resolved_at: Timestamp | null;
  resolved_by_id: PrincipalId | null;
  resolution: 'answered' | 'timed_out' | 'withdrawn' | null;
  chosen_option_id: string | null;
  free_text: string | null;
}
```

**`timeout_action` is the field most systems omit and it is the one that makes agents
unblockable.** An agent must be able to reason about its own stall. Default it from
`blast_radius`: `irreversible` → `abort`, `none`/`reversible` → `proceed`.

---

## 2. Rollup rules

`rollup` is computed on write and cached on the parent chain. Recompute walks upward
along `path`, so it is bounded by depth, not subtree size.

```ts
interface Rollup {
  descendant_count: number;
  open_count: number;
  attention: AttentionFlag | null;  // the only thing that punches upward
  worst_blast_radius: BlastRadius;
  consumed: Budget;                 // summed across subtree
  earliest_deadline: Timestamp | null;
}

type AttentionFlag = 'approval' | 'blocked' | 'failed' | 'over_budget';
```

Resolution order, first match wins:

| Condition anywhere in subtree | Parent surfaces |
|---|---|
| any descendant `awaiting_approval` | `approval` |
| any descendant `failed` | `failed` |
| any descendant `blocked` | `blocked` |
| subtree `consumed` > 0.9 × `budget` | `over_budget` |
| all descendants closed and own state closed | `null` — collapses |
| otherwise | `null`, parent shows `running` |

That table is the product. A director watching six root items sees six rows and a
badge; a staff engineer drills to depth four on the one that is red. Everything
healthy is invisible by construction.

---

## 3. Interrupt budget

Severity is computed server-side. Agents do not get to declare their own urgency,
because every agent believes its own blocker is the important one.

```
severity = w1 * blast(blast_radius)          // none 0.0 … irreversible 1.0
         + w2 * (1 - confidence)             // uncertain agents are riskier
         + w3 * deadline_pressure            // 0..1, sigmoid on time remaining
         + w4 * root_priority                // human-assigned, on the root item
```

Routing:

- `severity >= 0.7` → **immediate**, bypasses budget and quiet hours entirely.
- `0.4 <= severity < 0.7` → **queued**, spends one unit of the owner's hourly budget.
  Budget exhausted → demote to digest.
- `severity < 0.4` → **digest**, batched into a periodic roll-up.
- Owner in quiet hours or unavailable → route to `auto_delegate_to`, else hold to
  digest unless immediate.

Every escalation, however routed, still lands in the owner's queue. Routing decides
whether it *interrupts*, never whether it is *visible*. The distinction matters:
nothing is silently dropped, it is only deferred.

---

## 4. MCP surface

Exposed as an MCP server so Claude Code, Codex or any MCP client participates without
bespoke integration. Design rule: every tool is something an agent does *mid-execution
anyway*. No bookkeeping-only calls, because agents skip those under context pressure.

### 4.1 Tools

| Tool | Purpose | Notes |
|---|---|---|
| `work.create` | Create an item under a parent | Requires `idempotency_key` |
| `work.fan_out` | Create N children atomically | Rejected if it oversubscribes budget |
| `work.claim` | Take ownership, declare `confidence` | Transitions `ready` → `running` |
| `work.report` | Append note / tool_call / artifact | The high-frequency call |
| `work.set_state` | Move state, `state_reason` required for non-happy paths | |
| `work.escalate` | Raise an escalation | Blocking or non-blocking |
| `work.complete` | Close with result and artifacts | Triggers parent rollup |
| `work.abandon` | Close unsuccessfully with reason | |
| `work.query` | Read subtree, siblings, or own queue at depth | Agent context hydration |

**`work.escalate` is the interesting one.** Called with `blocking: true` it long-polls
to `timeout_at` and returns a discriminated result the agent can branch on
deterministically:

```jsonc
// request
{
  "work_item_id": "wi_04d7",
  "kind": "approval",
  "question": "Send the revised quote to the client?",
  "context_summary": "Rebuilt pricing after the bureau change. Total moved 4,180 -> 4,610 GBP.",
  "options": [
    { "id": "send",   "label": "Send it" },
    { "id": "hold",   "label": "Hold for review" },
    { "id": "revise", "label": "Revise downward" }
  ],
  "blocking": true,
  "timeout_seconds": 1800,
  "timeout_action": "abort"
}

// response
{
  "resolution": "answered",          // answered | timed_out | withdrawn
  "chosen_option_id": "hold",
  "free_text": "Check the illion figure first.",
  "resolved_by": "pr_roscoe",
  "waited_seconds": 214
}
```

Constrain `options` to a small set and `context_summary` to a length that renders on
a phone. If a human cannot resolve it from a lock screen, the escalation is badly
formed and the server should reject it.

### 4.2 Resources

Read-only, URI-addressed, cacheable:

- `workitem://{id}` — item plus recent transcript
- `workitem://{id}/tree?depth={n}&attention_only={bool}` — the altitude query
- `principal://{id}/queue` — open items and pending escalations
- `workitem://{id}/provenance` — context refs and digests for replay

### 4.3 Auth

Agent connects with a token minted from its delegating principal. Server derives the
capability set by intersection with the delegation chain and refuses anything outside
it — the agent cannot request scope it was not granted, and there is no path for it to
widen its own. Every mutation records the full chain.

---

## 5. Open questions

1. **Do humans create work items at all in v1?** Arguably a human writes one root
   intent and never touches the tree again. If true, the human-authoring UI is a text
   box and the entire build effort goes into the read surface.
2. **Rollup on write vs. on read.** Write-side is fast to read and expensive under
   fan-out storms; read-side inverts that. Probably write-side with a debounce window,
   but this needs load numbers from real agent traffic.
3. **Does `spec` earn its place in v1**, or is `intent` plus transcript sufficient
   until acceptance criteria are actually being checked by something?
4. **Cross-tree dependencies.** Strict tree is clean and will eventually be wrong.
   Adding a `blocks` / `blocked_by` edge set turns it into a DAG and complicates every
   rollup rule. Defer, but know the shape of the concession.
5. **Retention on context snapshots.** Full replay fidelity is expensive and, in a
   regulated setting, is both the compliance selling point and a liability surface.

---

## 6. Thinnest testable slice

Postgres with `ltree`, one MCP server, no bespoke client. Escalations render into
Slack via webhook with option buttons; responses post back through the resolve
endpoint. Point an existing agentic squad at it and instrument two things:

- **Fan-out ratio** — children created per human-authored root. If it sits below ~5,
  the tree model is not earning its complexity and this is a Linear feature request
  rather than a company.
- **Escalation resolution latency** against severity band. This tells you whether the
  interrupt budget is actually protecting attention or just adding delay.

Everything else in this document is deferrable until those two numbers say the premise
holds.
