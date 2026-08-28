# Purview Step 1 Implementation Plan — Schema, MCP server, Slack escalation bridge

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the thinnest testable slice of Purview: the work-item schema, an MCP server exposing the nine `work.*` tools plus read resources, and a Slack bridge that renders escalations with option buttons and resolves them from button taps — no web UI.

**Architecture:** One long-running Node process hosts an Express HTTP server with three surfaces: MCP over Streamable HTTP at `/mcp` (so many agents share one work graph), Slack interactivity callbacks at `/slack/interactions`, and `/healthz`. A `PurviewService` owns all domain logic (state machine, budget narrowing, write-side rollup, server-computed severity, escalation routing and timeouts) over a `Store` interface. v0 ships a `MemoryStore`; the durable Postgres+ltree schema ships as `db/schema.sql` and a PG adapter is an explicit follow-up, not part of this slice.

**Tech Stack:** TypeScript (strict, ESM, NodeNext), Node 22, pnpm, `@modelcontextprotocol/sdk`, `zod`, `express`, `vitest`, `eslint` (flat config + typescript-eslint), `tsx` for dev.

**Spec:** `docs/spec/purview-spec.md` (schema & MCP surface — normative) and `docs/spec/purview-product-spec.md` (decisions D1–D5, build order §8).

## Global Constraints

- Gates: `./.claude/scripts/gates.sh full` must end `FACTORY_GATES: level=full status=GREEN`; requires working `typecheck`, `lint`, `test` scripts (`build` runs too if present).
- Never modify an existing test file after it lands (charter `TESTS_ARE_LOAD_BEARING: true`); only add new ones.
- Never merge; never touch `.claude/**`, `.factory/**`, `.agents/**`, `.codex/**`, `AGENTS.md`.
- D4: `spec` field exists in schema, unused by any surface. D5: strict tree, no cross-links.
- `context_summary` ≤ 280 chars, `options` 1..5 for `approval`/`decision` — server rejects violations at creation (product spec §4.4 hard constraint).
- Severity is computed server-side only; agents never pass severity.
- `work.create` requires `idempotency_key`; replays return the existing item.
- Budgets narrow downward and are enforced server-side; `fan_out` is atomic and rejected if it oversubscribes the parent's remaining budget.
- Routing decides whether an escalation *interrupts*, never whether it is *visible*: every escalation lands in the owner's queue regardless of band.

## Locked decisions (made in this plan, consistent with the spec)

- **Severity weights (placeholders, §3):** `w1=0.4` blast, `w2=0.2` (1−confidence), `w3=0.2` deadline pressure, `w4=0.2` root priority. Blast map: none 0, reversible 1/3, costly 2/3, irreversible 1. Bands: ≥0.7 immediate, ≥0.4 queued, else digest. Queued spends one unit of `interrupts_per_hour`; exhausted → demote to digest.
- **`priority` field** (0..1, default 0.5) added to WorkItem — the spec's severity formula needs `root_priority` and product J1 says the human sets priority at delegation.
- **Timeout semantics (J5):** on `timeout_at` with no answer → resolution `timed_out`, a `decision` transcript entry with no human author, then: `abort` → item `failed`; `proceed` → item `running`; `escalate_up` → new escalation routed to the owner's delegator; `fallback_owner` → new escalation routed to the root item's owner.
- **Default `timeout_action` from blast radius:** `irreversible`/`costly` → `abort`; `none`/`reversible` → `proceed`.
- **Principal identity over MCP:** requests carry `x-purview-principal: <display name>` (header); unknown names auto-register as `agent` principals delegated by the configured default human (`PURVIEW_HUMAN` env, default "operator"). Delegation depth ceiling 8. Full capability intersection is deferred; the delegation chain is recorded on every mutation.
- **Slack transport:** outbound via `SLACK_WEBHOOK_URL` (Block Kit with buttons); inbound interactivity POSTs to `/slack/interactions`, verified with `SLACK_SIGNING_SECRET` (v0 signature scheme, 5-min replay window); resolved messages are updated in place via the payload's `response_url`. When Slack env is absent the bridge logs to stdout and everything else still works.
- **Digest:** items routed `digest` accumulate; `flushDigest()` posts one batched Slack message; the server flushes on `DIGEST_INTERVAL_MS` when set. Quiet hours: if the owner is in quiet hours and the band is not immediate, hold to digest (spec §3).
- **Storage:** `MemoryStore` behind a `Store` interface; `db/schema.sql` is the canonical Postgres DDL (ltree path, GiST index). Persistence adapter is out of scope for this slice and stated in the README.
- **MCP sessions:** stateless Streamable HTTP (`sessionIdGenerator: undefined`, JSON responses) — each POST creates a short-lived server bound to the shared service; blocking `work.escalate` long-polls inside the tool handler.

## File structure

```
package.json / tsconfig.json / tsconfig.build.json / eslint.config.js / vitest.config.ts / .gitignore
db/schema.sql                  # canonical Postgres DDL (ltree), the "Schema" deliverable
src/domain/types.ts            # all domain types verbatim from spec §1 (+ priority)
src/domain/ids.ts              # prefixed ids (pr_/wi_/esc_/te_), 4-hex path segments
src/domain/states.ts           # WorkState transition table + reason-required rule
src/domain/budget.ts           # fitsWithin / add / remaining / overBudget(0.9 rule)
src/domain/rollup.ts           # computeRollup(item, childRollups…) per §2 table
src/domain/severity.ts         # computeSeverity + routeEscalation per §3
src/store/store.ts             # Store interface
src/store/memory.ts            # MemoryStore (Map-based, path-prefix subtree queries)
src/service/purview.ts         # PurviewService: the nine tool behaviours + resolve/timeout
src/slack/verify.ts            # v0 signature verification (timing-safe)
src/slack/blocks.ts            # escalation -> Block Kit; resolved -> updated blocks; digest blocks
src/slack/bridge.ts            # SlackBridge: post/update/digest via fetch; console fallback
src/mcp/server.ts              # buildMcpServer(service, principal): tools + resources
src/http/app.ts                # express app: /mcp, /slack/interactions, /healthz
src/server.ts                  # entry: env config, wiring, listen
tests/*.test.ts                # one file per module above
README.md
```

---

### Task 1: Scaffold — toolchain green on an empty project

**Files:** `package.json`, `tsconfig.json`, `tsconfig.build.json`, `eslint.config.js`, `vitest.config.ts`, `.gitignore`, `tests/smoke.test.ts`, `src/domain/ids.ts` (minimal), `db/.gitkeep`

- [ ] `pnpm init`; add deps `@modelcontextprotocol/sdk zod express`, dev deps `typescript tsx vitest eslint @eslint/js typescript-eslint @types/express @types/node`.
- [ ] Scripts: `dev` = `tsx watch src/server.ts`, `typecheck` = `tsc --noEmit`, `lint` = `eslint .`, `test` = `vitest run`, `build` = `tsc -p tsconfig.build.json`. `"type": "module"`.
- [ ] tsconfig: `strict`, `module`/`moduleResolution` NodeNext, `target` ES2022, `noEmit` in base; build config emits to `dist/` excluding tests.
- [ ] Flat eslint config with typescript-eslint recommended; ignore `dist`, `node_modules`, `docs`.
- [ ] `tests/smoke.test.ts` exercises `newId('wi')` from `src/domain/ids.ts` (id shape `wi_[0-9a-f]{8}`; `newPathSegment()` is 4 hex chars).
- [ ] `./.claude/scripts/gates.sh full` → GREEN.

### Task 2: Domain types, ids, state machine

**Files:** `src/domain/types.ts`, `src/domain/ids.ts`, `src/domain/states.ts`, `tests/states.test.ts`

**Produces:** every interface from spec §1 verbatim (Principal, AttentionProfile, WorkItem+`priority`, Budget, TranscriptEntry, Escalation, Rollup, AttentionFlag, enums). `canTransition(from: WorkState, to: WorkState): boolean`; `reasonRequired(state: WorkState): boolean` (true for blocked/failed/abandoned).

Transition table (strict): proposed→ready|abandoned; ready→running|abandoned; running→blocked|awaiting_approval|done|failed|abandoned; blocked→running|failed|abandoned; awaiting_approval→running|failed|abandoned; done/failed/abandoned terminal.

- [ ] Failing tests: legal transitions allowed, illegal (e.g. done→running, proposed→running) rejected, reason-required states flagged.
- [ ] Implement; tests pass.

### Task 3: Budget arithmetic

**Files:** `src/domain/budget.ts`, `tests/budget.test.ts`

**Produces:** `addBudget(a, b): Budget`, `subtractBudget(a, b): Budget` (floor 0), `fitsWithin(child: Budget, remaining: Budget): boolean` (a child amount on a dimension the parent doesn't bound is allowed; a child exceeding any bounded dimension is not), `isOverBudget(consumed, budget): boolean` (any dimension > 0.9×budget).

- [ ] Failing tests: fit/overflow per-dimension, unbounded dimensions, 0.9 threshold edge (exactly 0.9 is not over), empty budgets.
- [ ] Implement; tests pass.

### Task 4: Rollup

**Files:** `src/domain/rollup.ts`, `tests/rollup.test.ts`

**Produces:** `computeRollup(own: {state, blast_radius, consumed, deadline, budget}, children: Rollup[]): Rollup` implementing §2 exactly — resolution order approval > failed > blocked > over_budget; `descendant_count`/`open_count` (open = not done/failed/abandoned) summed over children (+ the children themselves); `worst_blast_radius` max; `consumed` summed including own; `earliest_deadline` min including own. Attention also fires from the item's *own* state (an item awaiting approval surfaces `approval` itself).

- [ ] Failing tests: each attention flag, precedence order, collapse-to-null when all closed, over_budget from summed consumption vs own budget, earliest deadline.
- [ ] Implement; tests pass.

### Task 5: Severity + routing

**Files:** `src/domain/severity.ts`, `tests/severity.test.ts`

**Produces:**
```ts
interface SeverityInput { blast_radius: BlastRadius; confidence: number | null;
  deadline: Date | null; now: Date; root_priority: number; }
computeSeverity(i: SeverityInput): number            // clamped 0..1, weights above
deadlinePressure(deadline, now): number              // 1/(1+exp((hoursLeft-24)/8)); no deadline → 0; past due → 1
type Band = 'immediate' | 'queued' | 'digest'
routeEscalation(severity, owner: {attention: AttentionProfile|null} | null,
  interruptsUsedThisHour: number, now: Date): { band: Band }
```
Routing: ≥0.7 immediate always; 0.4..0.7 queued unless hourly budget exhausted or owner in quiet hours → digest; <0.4 digest. `null` confidence treated as 0.5.

- [ ] Failing tests: band thresholds, quiet-hours demotion, budget-exhaustion demotion, immediate bypasses both, deadline pressure monotonic and 1 when past due.
- [ ] Implement; tests pass.

### Task 6: Store interface + MemoryStore

**Files:** `src/store/store.ts`, `src/store/memory.ts`, `tests/store.test.ts`

**Produces:** `Store` with sync methods (memory impl; interface returns plain values): principals CRUD (`putPrincipal/getPrincipal/findPrincipalByName/listPrincipals`), work items (`putWorkItem/getWorkItem/getByIdempotencyKey/children(parentId)/subtree(rootPath, maxDepth?)/itemsOwnedBy(principalId)`), transcript (`appendEntry` auto-`seq`, `entries(workItemId, kinds?)`), escalations (`putEscalation/getEscalation/openEscalationsFor(principalId)/openEscalations()`). `subtree` matches by materialised-path prefix.

- [ ] Failing tests: idempotency lookup, subtree by path prefix with depth cap, transcript seq monotonic per item, open escalations filter.
- [ ] Implement; tests pass.

### Task 7: PurviewService — work lifecycle

**Files:** `src/service/purview.ts`, `tests/service-work.test.ts`

**Produces:** `class PurviewService` constructed with `{ store, bridge?, config? }` where config carries `now()` override for tests. Methods (all take `actor: Principal`):

```ts
createPrincipal({kind, display_name, delegated_by?, attention?}): Principal   // depth ceiling 8
ensureAgent(name: string): Principal                                          // header auto-registration
createWork({parent_id?, intent, priority?, blast_radius?, budget?, deadline?, labels?, idempotency_key}): WorkItem
fanOut(parent_id, children: CreateChildSpec[], idempotency_key): WorkItem[]   // atomic budget check
claim(work_item_id, confidence?): WorkItem                                    // ready→running, owner=actor
report(work_item_id, kind: 'note'|'tool_call'|'artifact', body, payload?): TranscriptEntry
setState(work_item_id, state, state_reason?): WorkItem                        // enforces table + reason rule
complete(work_item_id, result?, artifacts?): WorkItem                         // →done, artifacts appended
abandon(work_item_id, reason): WorkItem
query({work_item_id?, principal_id?, depth?, attention_only?}): …             // subtree / own queue
```

Behaviours: `createWork` requires idempotency_key (replay returns existing); root items enter `ready` (D1/J1), children enter `ready` too (agents claim explicitly); path = parent.path + '.' + segment; budget must fit parent remaining (parent budget − Σ existing children budgets); every mutation appends a `state_change`/`note` transcript entry authored by actor and recomputes rollups up the parent chain (bounded by depth); consumed accounting: `report` accepts optional `cost: Budget` merged into item.consumed.

- [ ] Failing tests: idempotent create, fan_out atomic rejection on oversubscription, claim transitions + confidence recorded, setState reason enforcement, rollup punches up (approval > failed precedence via two branches), attention_only query returns only flagged paths, budget narrowing rejection.
- [ ] Implement; tests pass.

### Task 8: PurviewService — escalations, resolution, timeouts

**Files:** same service file, `tests/service-escalation.test.ts`

**Produces:**
```ts
escalate({work_item_id, kind, question, options?, context_summary, blocking?, timeout_seconds?, timeout_action?}, actor):
  Promise<EscalateResult>            // blocking: resolves on answer/timeout with {resolution, chosen_option_id, free_text, resolved_by, waited_seconds}
resolveEscalation(escalation_id, {chosen_option_id?, free_text?, resolver}): Escalation
pendingDigest(): Escalation[]; flushDigest(): Promise<void>
```
Rules: validation (summary ≤280, options 1..5 for approval/decision) throws; severity computed server-side from item's blast radius, claim-time confidence, earliest deadline (own else root), root priority; routing per Task 5 with owner = item owner's delegating human when the owner is an agent (interrupts humans, not agents); `approval` kind puts the item `awaiting_approval`; resolution appends a `decision` transcript entry (options shown included in payload), returns item to `running` when it was awaiting approval, notifies the Slack bridge to update the message; timeout via `setTimeout` to `timeout_at`, applying the locked timeout semantics; immediate/queued bands post to Slack at creation; digest band accumulates.

- [ ] Failing tests (vitest fake timers): blocking escalate resolves when answered (waited_seconds from fake clock), timeout fires `timed_out` + `abort`→failed + transcript decision entry with agent-visible result, `proceed` path, escalate_up creates a re-routed escalation, badly-formed escalation rejected (summary length, zero options for approval), queued band decremented from hourly budget, everything lands in owner queue regardless of band.
- [ ] Implement; tests pass.

### Task 9: Slack bridge

**Files:** `src/slack/verify.ts`, `src/slack/blocks.ts`, `src/slack/bridge.ts`, `tests/slack.test.ts`

**Produces:** `verifySlackSignature({signingSecret, timestamp, rawBody, signature, now?}): boolean` (v0 HMAC-SHA256, timing-safe compare, 300s window); `escalationBlocks(esc, item): Block[]` (question + context_summary + severity band + one button per option, `action_id: resolve:<escalationId>:<optionId>`); `resolvedBlocks(esc): Block[]`; `digestBlocks(escs): Block[]`; `class SlackBridge { postEscalation(esc, item): Promise<void>; postResolution(esc, response_url?): …; postDigest(escs): … }` using `fetch` against `SLACK_WEBHOOK_URL`, console fallback when unset; `parseInteraction(payloadJson): {escalation_id, option_id, user_name, response_url}` from Slack block_actions payload.

- [ ] Failing tests: signature valid/invalid/stale, blocks contain question + all option buttons + ≤280 summary, parseInteraction extracts ids from a realistic block_actions fixture, bridge posts to webhook (mock `fetch`) and falls back to console.
- [ ] Implement; tests pass.

### Task 10: MCP server — tools + resources

**Files:** `src/mcp/server.ts`, `tests/mcp.test.ts`

**Produces:** `buildMcpServer(service: PurviewService, principalName: string): McpServer` registering tools `work_create, work_fan_out, work_claim, work_report, work_set_state, work_escalate, work_complete, work_abandon, work_query` (MCP tool names use underscores; each described so an agent knows when to call it mid-execution; zod input schemas; results are JSON text content) and resources `workitem://{id}`, `workitem://{id}/tree` (query params depth/attention_only), `principal://{id}/queue`, `workitem://{id}/provenance`. Tool errors return `isError: true` with the reason (agents must be able to branch, not crash).

- [ ] Failing tests using `InMemoryTransport.createLinkedPair()` + MCP `Client`: list tools shows all nine; create→claim→report→complete round-trip mutates the shared service; escalate with `blocking:false` returns the escalation id; resource read returns item + transcript JSON; invalid state transition returns isError with message.
- [ ] Implement; tests pass.

### Task 11: HTTP app + entry + schema.sql + README

**Files:** `src/http/app.ts`, `src/server.ts`, `db/schema.sql`, `README.md`, `tests/http.test.ts`

**Produces:** `buildApp(service, {signingSecret?}): express.Express` — POST `/mcp` (StreamableHTTPServerTransport, stateless, JSON response mode, per-request server built with the `x-purview-principal` header, GET/DELETE → 405), POST `/slack/interactions` (urlencoded, raw-body signature verification when secret configured, resolves via service, 200 fast), GET `/healthz`. `src/server.ts` reads env (`PORT` 8788, `PURVIEW_HUMAN`, `SLACK_WEBHOOK_URL`, `SLACK_SIGNING_SECRET`, `DIGEST_INTERVAL_MS`), seeds the default human principal, starts digest interval, listens. `db/schema.sql`: ltree extension, principals/work_items/transcript_entries/escalations tables mirroring `types.ts` (JSONB for budget/rollup/options), GiST index on path, unique (work_item_id, seq), stated as the durable target the MemoryStore will be swapped for.

- [ ] Failing tests (supertest-style via `fetch` against an ephemeral listener, or express request injection): healthz 200; MCP POST initialize + tools/list round-trip with principal header; slack interaction with valid signature resolves an open escalation; invalid signature 401.
- [ ] Implement; tests pass. README: what this is, quickstart (`pnpm install`, `pnpm dev`), MCP client config snippet, Slack app setup (webhook + interactivity URL + signing secret), env table, explicitly-deferred list (Postgres adapter, capability intersection, web UI).

### Task 12: Verification

- [ ] `./.claude/scripts/gates.sh full` → quote `FACTORY_GATES:` line verbatim; must be GREEN.
- [ ] Self-review diff against spec §1–§4 and product D1–D5; fix gaps.
- [ ] Dispatch `factory-verifier` agent for an independent read (charter rule 5).

## Self-review notes (spec coverage)

- §1.1 Principal — Task 2/7 (capabilities recorded, intersection deferred & documented). §1.2 WorkItem — Tasks 2/6/7. §1.3 Transcript — Tasks 6/7 (context_digest stored when supplied; blob storage deferred). §1.4 Escalation — Tasks 5/8. §2 Rollup — Task 4/7. §3 Interrupt budget — Tasks 5/8. §4.1 Tools — Task 10. §4.2 Resources — Task 10. §4.3 Auth — header identity + delegation chain; capability enforcement deferred (documented in README). §6 Slice — Slack via webhook Task 9/11; fan-out + escalation-latency instrumentation available from transcript timestamps (created_at/resolved_at persisted).
- Deferred by decision, stated in README: Postgres adapter (schema ships), digest quiet-hour scheduling beyond hold-to-digest, `spec` field unused (D4), auditor surface (v2).
