# Factory queue snapshot

The operational queue lives in GitHub issue labels. This file is a reviewable snapshot
written by `factory-triage` and reported by `/factory`; implementation routines query
GitHub directly.

An unmerged update to this file must never block a later routine from seeing work. Durable
run evidence lives in one file per run under `docs/factory/runs/`.

**Dispositions**

| Disposition | Next stage |
|---|---|
| `ready-to-implement` | factory-implement picks it up |
| `ready-to-spec` | human runs factory-spec |
| `needs-info` | parked, question is on the issue |
| `wait-to-implement` | parked, blocker named below |
| `awaiting-review` | PR open, human owns it |
| `done` | merged by a human |

The corresponding live labels use the `factory:` prefix, for example
`factory:ready-to-implement` and `factory:awaiting-review`. The live issue also carries a
`factory-handoff:v1` comment with the fields needed by implementation.

---

_Snapshot rebuilt by `factory-triage` on 2026-09-17, superseding the `factory-spec` update of
2026-08-31 (gate 4 revision 3) still on `main`. Live labels are the source of truth._

The entire FQ-3 integration-suite chain — #3 (parent) and slices #5, #6, #7, #8, #9 (split
into #38/#39), #10, #18, #26, #28, #38, #39 — merged and closed since the last snapshot on
`main`. None of that work remains open. Six new issues were filed since (#32, #33, #40, #41
on 2026-09-01; #23 carried through `factory-spec` gates 1–4 on 2026-08-31 and split into
slices #46–#51). **13 issues are open.** Nothing has changed on any of them since
2026-09-02T06:05:52Z — this is the sixteenth consecutive daily triage run to confirm the same
13 dispositions with zero label changes. See this run's record
(`docs/factory/runs/2026-09-17T060545Z-triage-run.md`) for why: everything open is correctly
parked behind a human action (an attended session to approve a `.claude/scripts/gates.sh`
edit, or a `factory-spec` run) that has not happened in over two weeks.

Counts: ready-to-implement=0, ready-to-spec=6 (#11, #12, #32, #33, #40, #41),
wait-to-implement=7 (#23, #46, #47, #48, #49, #50, #51), needs-info=0, awaiting-review=0.

**The review queue is empty**, so nothing here is blocked by Charter §7's cap of three items
awaiting human review. The blocker is entirely upstream of that: a human has not yet run an
attended implementation session or a `factory-spec` session.

## Blocked on an attended human session (gates.sh chain)

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically, not just in prose (parent)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-17
- repro: not-attempted (tracking issue, spec already approved)
- files_expected: (none — this is now the slice-chain tracking issue; each slice carries its own)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged (the mandatory slices closing the §3 hole); #51 is gate 1's deliberately droppable §7 line-ceiling slice and its non-merge does not block closing this item
- confidence: high
- notes: Spec approved through factory-spec's four gates on 2026-08-31 (`docs/factory/specs/FQ-23/`). Nothing about scope is undecided; the sole remaining blocker is a human sitting in an attended session, since every slice edits `.claude/scripts/gates.sh`, which is `Edit`-denied in `settings.json` and Charter §2 `LOAD_BEARING`. An unattended `factory-implement` run tried #46 on 2026-09-01 and correctly stopped at the charter check without editing anything.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-17
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts, tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `./.claude/scripts/gates.sh full` prints a FACTORY_GATES line carrying `base_source=`, `protected_globs=` and `protected=`; `gates.sh fast` prints `base_source=not-measured protected=not-measured`; a bash older than 3.2 prints `misconfigured=unsupported-bash` and exits 2; the three tests pass, including one that runs the real `./.claude/scripts/gates.sh fast` in this repository and parses its line; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on an attended human session, not on design. A 2026-09-01 unattended implement run claimed this, correctly refused to edit `.claude/scripts/gates.sh` per Contract rule 2, and self-corrected the label; that correction was re-derived and confirmed independently on 2026-09-02 and again by this run. No unattended run can complete this regardless of label.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires: charter parse and real diff
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-09-17
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts, tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: modifying a pre-existing file matching a Charter §3 TESTS_PROTECTED glob makes `gates.sh full` report that file's path in `protected=` while `status` stays GREEN; adding a new file under the same glob reports `protected=none`; `protected_globs` equals the number of globs actually parsed from `docs/factory/CHARTER.md`; tests 1, 2, 3, 7 and 8 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #46 (slice 0 fields and `resolve_base`). Pre-agreed split seam if this measures over the 400-line ceiling: land tests 1, 2, 3, 7 as this slice, take test 8 and the glob-echo as slice 1b. Do not trim a test to fit.

## FQ-48: gates.sh slice 2 — diff shape: deletion, rename, committed state, empty-pathspec guard
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-09-17
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: deleting a pre-existing protected file reports its path; renaming one away reports it; a modification that is already committed reports identically to an uncommitted one; a charter yielding zero globs never invokes `git diff` with an empty pathspec; tests 4, 5, 6 and 19 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #47 (`measure_protected`, which this slice refines). Test 19 is the hardest to review — a zero-glob parse without a short-circuit would report every changed file as a protected-file modification.

## FQ-49: gates.sh slice 3 — charter fidelity: §3 flag, anchored parse, fail-closed degradation
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-09-17
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `TESTS_ARE_LOAD_BEARING: false` reports `protected=not-enforced`; an absent or renamed TESTS_PROTECTED block reports `undetermined`, never `none`; a fourth charter glob reports `protected_globs=4` and matches a file only under the new glob; a truncated block is visible in `protected_globs`; a deleted charter still produces a FACTORY_GATES line; tests 9, 10, 11, 12 and 18 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #47 (`parse_charter_section3`, which this slice completes). Test 9 is the slice's reason to exist — the charter becomes the single source of the rule with no second edit needed.

## FQ-50: gates.sh slice 4 — base-ref override, and the 'full HEAD' bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-09-17
- repro: confirmed (verified during spec: `./.claude/scripts/gates.sh full HEAD` prints a plausible clean report — `protected=none code_lines=0` — indistinguishable from a legitimate run)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: a supplied base ref is used only when it resolves, is an ancestor of HEAD, and is not HEAD itself on a clean tree, reporting `base_source=arg`; any failure of those three reports `base_source=none` and `protected=undetermined` without falling back to auto-detection; `gates.sh full HEAD` on a clean tree reports `undetermined`, not `none`; tests 13, 14, 15 and 16 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #46 (`resolve_base`, whose `$2` branch this slice adds). Closes a bypass verified live against this repository during the spec session.

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-09-17
- repro: confirmed (verified during spec: an add-only uncommitted change of 5 real lines measures `code_lines=0` under `git diff --numstat` alone, since it cannot see untracked files)
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md, tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- confidence: medium
- done_when: `gates.sh full` reports `code_lines=<n>` counting tracked changes and untracked non-documentation additions, plus `code_lines_committed=<n>` reproducing Charter §7's own invocation; `docs/**` and `**/*.md` are excluded from both; `code_lines` is `not-measured` at `fast` and `undetermined` when the base is undetermined; `.claude/skills/factory-verify/SKILL.md` states that `code_lines` is excluded from its "a mismatch is the finding" comparison; tests 20, 21, 22, 23 and 24 pass; no pre-existing test file is modified; gates GREEN at `deep`
- notes: deliberately droppable — gate 1 approved the §7 ceiling as independently reversible from slices 0–4. Touches two LOAD_BEARING files, so this run needs the human twice. `confidence: medium` because the untracked-lines counting logic is the newest reasoning in FQ-23.

---

## Needs a human spec run

## FQ-11: run the factory gates automatically on every push
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/11
- last_triaged: 2026-08-31 (not re-examined this run — unchanged since 2026-08-29)
- repro: not-attempted (no CI exists yet — nothing to reproduce)
- files_expected: .github/workflows/**
- load_bearing: true
- gate_level: deep
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: `.github/workflows/**` is Charter §2 `LOAD_BEARING`, which Charter §4 `NEEDS_SPEC` names directly.

## FQ-12: record Slack delivery outcome so a dropped escalation is observable
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/12
- last_triaged: 2026-08-31 (not re-examined this run — unchanged since 2026-08-29)
- repro: confirmed (`src/service/purview.ts` swallows every bridge failure — read, not executed)
- files_expected: src/service/purview.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: product-intent decision (what gets recorded, whether delivery failure changes escalation behaviour) — Charter §4 `NEVER_AUTOMATE` names product intent directly.

## FQ-32: four run records carry timestamps an hour off, minted from local time and labelled Z
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/32
- last_triaged: 2026-09-17
- repro: confirmed (each of the four records checked against an independent git/GitHub anchor in the issue body)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md, docs/factory/runs/2026-08-30T235500Z-implement-8.md, docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md, docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever .claude/skills/** change the approved spec adds for the minting rule
- load_bearing: true
- gate_level: deep
- confidence: medium
- notes: splits into an automatable docs-only correction (Charter §4 `AUTOMATABLE`, "Documentation and comment corrections") and a `.claude/skills/**` minting-rule change that is Charter §2 `LOAD_BEARING`. Filed as one issue; a spec (or a human) should decide whether to split it.

## FQ-33: a PR body's prose can silently close a queue item — two have already gone
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-17
- repro: confirmed (PR #29's body closed #28 via an incidental "close #28" sentence on merge, 2026-08-31)
- files_expected: docs/factory/specs/FQ-33/** (and whatever .claude/skills/** change the approved spec adds)
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: touches skill files that compose PR bodies (factory-implement at minimum), Charter §2 `LOAD_BEARING`. Worth prioritizing — two queue items already lost this way and the review queue is empty, so nothing competes for the attention budget.

## FQ-40: `workitem://{id}/tree` is unreadable unless both `depth` and `attention_only` are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-17
- repro: confirmed (measured over the real transport: bare, `?depth=1` and `?attention_only=true` all return `Resource not found`; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- confidence: high
- notes: one RFC 6570 template cannot express "either, both, or neither" in form-style expansion, so this is a shape decision. Not load-bearing, so `full` gates once specced.

## FQ-41: the claim protocol locks the branch, not the working tree
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-17
- repro: confirmed (observed 2026-08-31: creating a claim branch moved HEAD out from under a live run on #28 in the same checkout)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/**
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: the remote-ref claim on issue ownership worked correctly in the observed incident; the unprotected resource is the local checkout, shared across concurrent sessions. An agent may not rewrite its own claim protocol unattended in any case.

---

## Do not merge `archive/fq-5-slice0-original`

It is green and most of its lines are reused across the now-merged #5 and #18, but it *is*
the 515-line diff the Charter §7 ceiling stopped. It is a cherry-pick source only. Delete the
archive once its last consumer (already merged) is confirmed by a human read.

## Process note: unmerged triage PR backlog

Sixteen consecutive daily `factory: triage` PRs (#52 through #67, 2026-09-01 through
2026-09-16, plus this run's) are open and unmerged. Only the most recent need ever be read —
each is a full rebuild from live labels — but none has been merged or closed in over two
weeks, and nothing in that window required an unmerged snapshot to be treated as ground
truth, since GitHub labels never lagged. See `docs/factory/runs/2026-09-17T060545Z-triage-run.md`
for detail.
