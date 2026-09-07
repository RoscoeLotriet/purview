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

_Snapshot rebuilt by `factory-triage` on 2026-09-07. Live labels are the source of truth._

**FQ-3 (the integration suite epic) is complete and closed** — all ten slices merged, all 26
tests landed; #38 and #39 (the last two, split from #9) are on `main`. This run found no open
issue still tracking it.

**Everything currently open in the FQ-23 chain (gates.sh §3/§7 enforcement) is already
specced and correctly labeled**, and unchanged by this run. Gates 1–4 were approved by a
human in session on 2026-08-31; the six slices (#46–#51) plus the parent (#23) were already
re-triaged by an in-session run on 2026-09-01, and #46 specifically by a further correction
on 2026-09-02 after an unattended implement run correctly proved it cannot land without a
human present to approve a `.claude/` edit (Contract rule 2). This run independently
re-derived every one of those seven issues against `CHARTER.md` and reached the same
disposition on each, so no label or handoff comment was touched — see "What this run did"
in the run record for why re-confirming without changing anything is the correct outcome,
not a shortcut.

Counts: ready-to-implement=0, ready-to-spec=6 (#11, #12, #32, #33, #40, #41),
wait-to-implement=7 (#23, #46, #47, #48, #49, #50, #51), needs-info=0, awaiting-review=0.

**The review queue is empty** (Charter §7 caps it at 3), so there is room for a human to run
`factory-spec` on any of the six `ready-to-spec` items, or to sit in session and unblock the
FQ-23 chain, without approaching the limit.

## Claimable now

_(none — every open issue is either blocked or needs a human decision first)_

---

## Blocked on a human being in session

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically, not just in prose (parent)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-07
- repro: not-attempted (design gap, not a reproducible bug — spec already approved)
- files_expected: (none — tracking issue; each slice carries its own files_expected)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged (the mandatory slices that close the §3 enforcement hole); #51 is gate 1's deliberately droppable §7 line-ceiling slice and its non-merge does not block closing this item
- confidence: high
- notes: Unchanged this run. Spec (`docs/factory/specs/FQ-23/`) approved through all four gates by a human on 2026-08-31; this issue is now the slice-chain tracking issue, same shape as the former FQ-3.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-07
- repro: not-attempted (new test coverage from an approved spec slice, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts, tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: an attended human session claims this issue and approves the `.claude/scripts/gates.sh` edit in-session (Contract rule 2); once that happens, `./.claude/scripts/gates.sh full` prints a FACTORY_GATES line carrying `base_source=`, `protected_globs=` and `protected=`; `gates.sh fast` prints `base_source=not-measured protected=not-measured`; a bash older than 3.2 prints `misconfigured=unsupported-bash` and exits 2; the three tests pass, including one that runs the real `./.claude/scripts/gates.sh fast` in this repository and parses its line; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Unchanged this run. Was briefly mislabeled `ready-to-implement` (2026-08-31) and `ready-to-spec` (an unattended implement run's self-correction, 2026-09-01) before landing on `wait-to-implement` (2026-09-02) — see the issue's own comment thread. `.claude/scripts/gates.sh` is `Edit`-denied in `.claude/settings.json`; no unattended run can complete this regardless of scheduling. First in the chain — #47, #49, #50, #51 each name it as their blocker.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires: charter parse and real diff
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-09-07
- repro: not-attempted (new test coverage from an approved spec slice)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts, tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: modifying a pre-existing file matching a Charter §3 TESTS_PROTECTED glob makes `gates.sh full` report that file's path in `protected=` while `status` stays GREEN; adding a new file under the same glob reports `protected=none`; `protected_globs` equals the number of globs actually parsed from `docs/factory/CHARTER.md`; tests 1, 2, 3, 7 and 8 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Unchanged this run. Blocked on #46 (slice 0 supplies the field plumbing and `resolve_base` this slice fills in). Pre-agreed split seam if it overruns the 400-line ceiling: land tests 1, 2, 3, 7 here; take test 8 as slice 1b. Do not trim a test to fit.

## FQ-48: gates.sh slice 2 — diff shape: deletion, rename, committed state, empty-pathspec guard
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-09-07
- repro: not-attempted (new test coverage from an approved spec slice)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: deleting a pre-existing protected file reports its path; renaming one away reports it; a modification that is already committed reports identically to an uncommitted one; a charter yielding zero globs never invokes `git diff` with an empty pathspec; tests 4, 5, 6 and 19 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Unchanged this run. Blocked on #47 (refines `measure_protected`).

## FQ-49: gates.sh slice 3 — charter fidelity: §3 flag, anchored parse, fail-closed degradation
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-09-07
- repro: not-attempted (new test coverage from an approved spec slice)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `TESTS_ARE_LOAD_BEARING: false` reports `protected=not-enforced`; a charter whose TESTS_PROTECTED block is absent or renamed reports `undetermined` and never `none`; a charter given a fourth glob reports `protected_globs=4` and reports a file matching only the new glob; a truncated block is visible in `protected_globs`; a deleted charter still produces a FACTORY_GATES line; tests 9, 10, 11, 12 and 18 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Unchanged this run. Blocked on #47 (completes `parse_charter_section3`).

## FQ-50: gates.sh slice 4 — base-ref override, and the "full HEAD" bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-09-07
- repro: confirmed (bypass verified against this repository during the spec: `gates.sh full HEAD` on a clean tree prints a real short SHA with an empty diff, indistinguishable from a legitimate run)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: a supplied base ref is used only when it resolves, is an ancestor of HEAD, and is not HEAD itself on a clean tree, reporting `base_source=arg`; any failure of those three reports `base_source=none` and `protected=undetermined` without falling back to auto-detection; `gates.sh full HEAD` on a clean tree reports `undetermined` and not `none`; tests 13, 14, 15 and 16 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Unchanged this run. Blocked on #46 (adds the `$2` branch to `resolve_base`).

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-09-07
- repro: confirmed (`git diff --numstat` cannot see an untracked file; verified an add-only 5-line change measures `code_lines=0` without the untracked-count fix)
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md, tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `gates.sh full` reports `code_lines=<n>` counting tracked changes and untracked non-documentation additions, plus `code_lines_committed=<n>` reproducing Charter §7's own invocation; `docs/**` and `**/*.md` are excluded from both; `code_lines` is `not-measured` at `fast` and `undetermined` when the base is undetermined; `.claude/skills/factory-verify/SKILL.md` states that `code_lines` is excluded from its "a mismatch is the finding" comparison; tests 20, 21, 22, 23 and 24 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: medium
- notes: Unchanged this run. Blocked on #46. Deliberately droppable — gate 1 approved the §7 ceiling as independently reversible from the §3 enforcement slices 0–4. Touches two load-bearing files (`gates.sh` and `factory-verify/SKILL.md`), so two human approvals in one session.

---

## Needs a human spec run

## FQ-11: run the factory gates automatically on every push
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/11
- last_triaged: 2026-08-31
- repro: not-attempted (no CI exists yet — nothing to reproduce)
- files_expected: .github/workflows/**
- load_bearing: true
- gate_level: deep
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Not re-examined — not updated since the prior triage run and already correctly labeled. `.github/workflows/**` is Charter §2 `LOAD_BEARING`, which Charter §4 `NEEDS_SPEC` names directly.

## FQ-12: record Slack delivery outcome so a dropped escalation is observable
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/12
- last_triaged: 2026-08-31
- repro: confirmed (`src/service/purview.ts:727-736` swallows every bridge failure — read, not executed)
- files_expected: src/service/purview.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Not re-examined — not updated since the prior triage run and already correctly labeled. Product-intent decision (what gets recorded, whether delivery failure changes escalation behaviour) — Charter §4 `NEVER_AUTOMATE` names product intent directly.

## FQ-32: docs(factory): four run records carry timestamps an hour off, minted from local time and labelled Z
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/32
- last_triaged: 2026-09-07
- repro: confirmed (each of the four records is anchored to an independent git/GitHub timestamp in the issue body; all four are off by exactly one hour, direction inconsistent)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md, docs/factory/runs/2026-08-30T235500Z-implement-8.md, docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md, docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever `.claude/skills/**` change the approved spec adds for the minting rule
- load_bearing: true
- gate_level: deep
- confidence: medium
- notes: Unchanged this run — independently re-derived, same conclusion. Splits into an `AUTOMATABLE` docs-only half (appending `## Timestamp correction` sections, never renaming files or touching `run_id`s) and a `NEEDS_SPEC` half (the `date -u` / claim-commit minting rule lives in `.claude/skills/**`). Filed as one issue, so narrowing scope is a spec/human call, not triage's to make unilaterally. `confidence: medium` is about the right-sized split, not the disposition.

## FQ-33: a PR body's prose can silently close a queue item — two have already gone
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-07
- repro: confirmed (#28 confirmed closed by a `close #28` phrase inside PR #29's body offering a rejected alternative; #26 shows the same symptom, mechanism unconfirmed)
- files_expected: docs/factory/specs/FQ-33/** (and whatever `.claude/skills/**` change the approved spec adds)
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: Unchanged this run — independently re-derived, same conclusion. Fix touches `.claude/skills/**` (at minimum `factory-implement`), Charter §2 `LOAD_BEARING`, which Charter §4 `NEEDS_SPEC` names directly regardless of diff size. Worth prioritizing: review queue is empty and this has already caused two silent, invisible issue closes.

## FQ-40: mcp: workitem://{id}/tree is unreadable unless both depth and attention_only are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-07
- repro: confirmed (measured over the real MCP transport: bare, `?depth=1` and `?attention_only=true` alone all return "Resource not found"; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- confidence: high
- notes: Unchanged this run — independently re-derived, same conclusion. Changes a public MCP read surface (a resource template's URI-matching behaviour), which Charter §4 `NEEDS_SPEC` names directly ("Anything changing a public API"). Not on the `LOAD_BEARING` glob list, so `full` gates once specced, not `deep`.

## FQ-41: factory: the claim protocol locks the branch, not the working tree — two local runs in one checkout collide silently
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-07
- repro: confirmed (observed 2026-08-31: creating `claude/fq-9` moved `HEAD` out from under a live run on #28 in the same checkout)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/** (and whatever the approved spec adds)
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: Unchanged this run — independently re-derived, same conclusion. Touches the claim protocol itself (`CONTRACT.md` + `.claude/skills/factory-implement/**`), Charter §2 `LOAD_BEARING`. Not urgent — nothing is currently broken on `main` — but real, silent, and cross-contaminating when it happens.

---

## Do not merge `archive/fq-5-slice0-original`

It is green and most of its lines are reused across the now-merged #5 and #18, but it *is*
the 515-line diff the Charter §7 ceiling stopped. It is a cherry-pick source only. Delete the
archive once its last consumer (already merged) is confirmed by a human read. Not re-verified
this run — carried forward from the prior snapshot.
