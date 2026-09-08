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

_Snapshot rebuilt by `factory-triage` on 2026-09-08, superseding the `factory-spec` snapshot
of 2026-08-31. Live labels are the source of truth._

The FQ-3 integration-suite chain (10 slices, #5/#18/#6/#7/#26/#8/#10/#28/#38/#39) and its
parent tracking issue #3 all merged and closed between 2026-08-30 and 2026-08-31 and are
dropped from this snapshot. **The review queue is empty** — no issue currently carries
`factory:awaiting-review`.

Counts: ready-to-implement=0, ready-to-spec=6 (#11, #12, #32, #33, #40, #41),
wait-to-implement=7 (#23, #46, #47, #48, #49, #50, #51), needs-info=0, awaiting-review=0.

## Blocked on its own slices — FQ-23 (gates.sh mechanical enforcement of Charter §3/§7)

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically, not just in prose (parent)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-08
- repro: not-attempted (design gap, not a reproducible bug)
- files_expected: (none — parent tracking issue; each slice carries its own)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged; #51 is gate 1's deliberately droppable §7 line-ceiling slice and its non-merge does not block closing this item
- confidence: high
- notes: Unchanged this run. `factory-spec` took this through all four gates (human-approved 2026-08-31) and filed slices #46–#51. Re-confirmed against the charter: still correctly `wait-to-implement`, not `ready-to-spec` — the spec decision already happened.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-08
- repro: not-attempted (new test coverage against a spec, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts, tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: an attended human session claims this issue and approves the `.claude/scripts/gates.sh` edit in-session (Contract rule 2); once that happens, `./.claude/scripts/gates.sh full` prints a FACTORY_GATES line carrying `base_source=`, `protected_globs=` and `protected=`; `gates.sh fast` prints `base_source=not-measured protected=not-measured`; a bash older than 3.2 prints `misconfigured=unsupported-bash` and exits 2; the three tests pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Re-confirmed, not re-derived from scratch. An unattended implement run claimed this on 2026-09-01, correctly refused to edit `.claude/scripts/gates.sh` per Contract rule 2 (also `Edit`-denied in `.claude/settings.json`), and a subsequent triage pass moved it from the routed-but-misleading `ready-to-spec` to `wait-to-implement` alongside its siblings #47–#51 — all blocked on the identical constraint (an attended session), not on undecided scope. This run concurs: `ready-to-implement` is not achievable unattended for any FQ-23 slice, so leaving this at `ready-to-implement` (as `factory-spec` originally wrote it) would just cost the next scheduled implement run an identical wasted cycle. No further label churn.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires: charter parse and real diff
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-09-08
- repro: not-attempted (new test coverage against a spec)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts, tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: modifying a pre-existing file matching a Charter §3 TESTS_PROTECTED glob makes `gates.sh full` report that file's path in `protected=` while `status` stays GREEN; adding a new file under the same glob reports `protected=none`; `protected_globs` equals the number of globs actually parsed from `docs/factory/CHARTER.md`; tests 1, 2, 3, 7 and 8 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Unchanged. Blocked on #46 (slice 0 — the field plumbing and `resolve_base` this slice fills in), which has not merged.

## FQ-48: gates.sh slice 2 — diff shape: deletion, rename, committed state, empty-pathspec guard
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-09-08
- repro: not-attempted (new test coverage against a spec)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: deleting a pre-existing protected file reports its path; renaming one away reports it; a modification that is already committed reports identically to an uncommitted one; a charter yielding zero globs never invokes `git diff` with an empty pathspec; tests 4, 5, 6 and 19 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Unchanged. Blocked on #47 (slice 1 — `measure_protected`, which this slice refines), which has not merged.

## FQ-49: gates.sh slice 3 — charter fidelity: §3 flag, anchored parse, fail-closed degradation
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-09-08
- repro: not-attempted (new test coverage against a spec)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `TESTS_ARE_LOAD_BEARING: false` reports `protected=not-enforced`; a charter whose TESTS_PROTECTED block is absent or renamed reports `undetermined` and never `none`; a charter given a fourth glob reports `protected_globs=4` and reports a file matching only the new glob; a truncated block is visible in `protected_globs`; a deleted charter still produces a FACTORY_GATES line; tests 9, 10, 11, 12 and 18 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Unchanged. Blocked on #47 (slice 1 — `parse_charter_section3`, which this slice completes), which has not merged.

## FQ-50: gates.sh slice 4 — base-ref override, and the 'full HEAD' bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-09-08
- repro: confirmed (`./.claude/scripts/gates.sh full HEAD` verified during the spec session to print a plausible `base_source=` with an empty diff — the bypass this slice closes)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: a supplied base ref is used only when it resolves, is an ancestor of HEAD, and is not HEAD itself on a clean tree, reporting `base_source=arg`; any failure of those three reports `base_source=none` and `protected=undetermined` without falling back to auto-detection; `gates.sh full HEAD` on a clean tree reports `undetermined` and not `none`; tests 13, 14, 15 and 16 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Unchanged. Blocked on #46 (slice 0 — `resolve_base`, whose `$2` branch this slice adds), which has not merged.

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-09-08
- repro: confirmed (`git diff --numstat` verified during the spec to report `code_lines=0` for an add-only uncommitted change — the defect test 20 exists for)
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md, tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `gates.sh full` reports `code_lines=<n>` counting tracked changes and untracked non-documentation additions, plus `code_lines_committed=<n>` reproducing Charter §7's own invocation; `docs/**` and `**/*.md` are excluded from both; `code_lines` is `not-measured` at `fast` and `undetermined` when the base is undetermined; `.claude/skills/factory-verify/SKILL.md` states that `code_lines` is excluded from its "a mismatch is the finding" comparison; tests 20, 21, 22, 23 and 24 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: medium
- notes: Unchanged. Blocked on #46 (slice 0 — `resolve_base` and the field plumbing), which has not merged. Deliberately droppable per gate 1 — its non-merge does not block closing #23.

---

## Needs a human spec run

## FQ-11: run the factory gates automatically on every push
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/11
- last_triaged: 2026-08-31 (not re-examined this run — no activity since)
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
- last_triaged: 2026-08-31 (not re-examined this run — no activity since)
- repro: confirmed (`src/service/purview.ts:727-736` swallows every bridge failure — read, not executed)
- files_expected: src/service/purview.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Product-intent decision (what gets recorded, whether delivery failure changes escalation behaviour) — Charter §4 `NEVER_AUTOMATE` names product intent directly.

## FQ-32: four run records carry timestamps an hour off, minted from local time and labelled Z
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/32
- last_triaged: 2026-09-08 (re-confirmed; last substantive change 2026-09-01)
- repro: confirmed (each of the four named records checked against a git/GitHub anchor in the issue body; each has at least one field off by exactly one hour)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md, docs/factory/runs/2026-08-30T235500Z-implement-8.md, docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md, docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever `.claude/skills/**` change the approved spec adds for the minting rule
- load_bearing: true
- gate_level: deep
- confidence: medium
- notes: Splits into an automatable docs-only half (appending `## Timestamp correction` sections — Charter §4 `AUTOMATABLE`, "Documentation and comment corrections") and a `.claude/skills/**` minting-rule half that is Charter §2 `LOAD_BEARING`. Filed as one issue; a spec (or a human) should decide whether to split it. `confidence: medium` because the disposition itself isn't in doubt, only the right-sized split.

## FQ-33: a PR body's prose can silently close a queue item — two have already gone
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-08 (re-confirmed; last substantive change 2026-09-01)
- repro: confirmed (#28 closed on merge of PR #29 by a `close #28` sentence in its "Not done" prose; #26 closed the same way with the closing-keyword mechanism unconfirmed)
- files_expected: docs/factory/specs/FQ-33/** (and whatever `.claude/skills/**` change the approved spec adds)
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: Fix touches `.claude/skills/factory-implement/**` at minimum (PR-body composition), Charter §2 `LOAD_BEARING`. Worth prioritizing — the review queue is empty and two queue items have already been silently lost to this mechanism.

## FQ-40: workitem://{id}/tree is unreadable unless both depth and attention_only are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-08 (re-confirmed; last substantive change 2026-09-01)
- repro: confirmed (measured over the real transport: bare, `?depth=1` and `?attention_only=true` alone all return `Resource not found`; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- confidence: high
- notes: Changes a public MCP read surface (a resource template's URI-matching behaviour) — Charter §4 `NEEDS_SPEC` names this directly ("Anything changing a public API or exported type signature"). Not on the `LOAD_BEARING` glob list, so `full` gates once specced, not `deep`.

## FQ-41: the claim protocol locks the branch, not the working tree
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-08 (re-confirmed; last substantive change 2026-09-01)
- repro: confirmed (observed 2026-08-31: creating `claude/fq-9` moved `HEAD` out from under a live run on #28 in the same checkout)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/** (and whatever the approved spec adds)
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: Touches `CONTRACT.md`'s claim protocol and `.claude/skills/factory-implement/**`, Charter §2 `LOAD_BEARING`. Not urgent (nothing currently broken on `main`), but real — two concurrent local runs collided silently and were caught by chance.

---

## Do not merge `archive/fq-5-slice0-original`

It is green and most of its lines are reused across the now-merged #5 and #18, but it *is*
the 515-line diff the Charter §7 ceiling stopped. It is a cherry-pick source only. Delete the
archive once its last consumer (already merged) is confirmed by a human read.
