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

_Snapshot rebuilt by `factory-triage` on 2026-09-11, superseding the version on `main` dated
2026-08-31 (written by `factory-spec` at FQ-3 gate 4 revision 3). That version predates
issues #23 and #46–#51 existing at all, and still listed the now-closed FQ-3 parent (#3) as
open. Ten intervening daily triage runs (2026-09-01 through 2026-09-10, PRs #52–#61)
rebuilt this file identically on their own branches but none merged — see the run record
for this date for what that means and why it isn't this run's call to fix._

Counts: ready-to-implement=0, ready-to-spec=6 (#11, #12, #32, #33, #40, #41),
wait-to-implement=7 (#23, #46, #47, #48, #49, #50, #51), needs-info=0, awaiting-review=0.

**The review queue is empty.** Nothing is competing for the Charter §7 human-attention
budget, so either the FQ-23 chain (needs one attended session) or any of the six
`ready-to-spec` items could be picked up right now at no cost to the cap.

## Blocked — needs an attended human session, not more specification

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically (parent / tracking)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-11 (re-derived; unchanged since 2026-09-01)
- repro: not-attempted (tracking issue, no code of its own)
- files_expected: (none — tracking issue; each slice carries its own)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged (the mandatory slices that close the §3 enforcement hole); #51 is gate 1's deliberately droppable §7 line-ceiling slice and its non-merge does not block closing this item
- confidence: high
- notes: Fully specced and human-approved through all four `factory-spec` gates on 2026-08-31 (`docs/factory/specs/FQ-23/`). Every slice's edit surface is `.claude/scripts/gates.sh`, which Charter §2 lists `LOAD_BEARING` and Contract rule 2 puts off-limits to any unattended run; `.claude/settings.json` also denies `Edit` on the path mechanically. This is not a spec gap — it is waiting on a person sitting in an attended session to approve the edit, then reading the resulting draft PR. An implement run claimed #46 unattended on 2026-09-01, correctly stopped at the charter check without editing anything, and self-corrected its own label from `ready-to-implement` to `ready-to-spec`, flagging that `ready-to-spec` was the routed label but not the real blocker. Triage aligned #46 to `wait-to-implement` alongside its siblings the same day.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-11 (re-derived; unchanged since 2026-09-02)
- repro: not-attempted (new test coverage against new script behavior, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts, tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: an attended human session claims this issue and approves the `.claude/scripts/gates.sh` edit in-session (Contract rule 2); once that happens, `./.claude/scripts/gates.sh full` prints a FACTORY_GATES line carrying `base_source=`, `protected_globs=` and `protected=`; `gates.sh fast` prints `base_source=not-measured protected=not-measured`; a bash older than 3.2 prints `misconfigured=unsupported-bash` and exits 2; the three tests pass, including one that runs the real `./.claude/scripts/gates.sh fast` in this repository and parses its line; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: The tracer bullet of the FQ-23 chain. Two hazards are documented in the issue and its handoff comment: bash 3.2 dies on an empty-array expansion under `set -u` (no bash arrays in this design), and no test may invoke this repository's own `gates.sh` at `full`/`deep` (infinite recursion through `pnpm test`) — tests run a copy in a temp repo.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires: charter parse and real diff
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-09-11 (re-derived; unchanged since 2026-08-31)
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts, tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: modifying a pre-existing file matching a Charter §3 TESTS_PROTECTED glob makes `gates.sh full` report that file's path in `protected=` while `status` stays GREEN; adding a new file under the same glob reports `protected=none`; `protected_globs` equals the number of globs actually parsed from `docs/factory/CHARTER.md`; tests 1, 2, 3, 7 and 8 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #46 (slice 0 supplies the field plumbing and `resolve_base` this slice fills in). Carries a pre-agreed split seam: if the slice measures over the Charter §7 ceiling, land tests 1/2/3/7 here and take test 8 plus the glob-echo as slice 1b, without another spec round. Same attended-session blocker as #46.

## FQ-48: gates.sh slice 2 — diff shape: deletion, rename, committed state, empty-pathspec guard
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-09-11 (re-derived; unchanged since 2026-08-31)
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `--diff-filter=MDT` and `--no-renames` cover deletion, rename-as-delete and committed-state modification correctly; a zero-glob parse never diffs with an empty pathspec (test 19); tests 4, 5, 6 and 19 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #47 (extends `measure_protected`). Test 19 is the one guarding against the check silently firing on every changed file if the charter parse ever returns zero globs — flagged in the issue as the test to review hardest. Same attended-session blocker.

## FQ-49: gates.sh slice 3 — charter fidelity: §3 flag, anchored parse, fail-closed degradation
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-09-11 (re-derived; unchanged since 2026-08-31)
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `TESTS_ARE_LOAD_BEARING` is read and honored (`not-enforced` when false); the `^TESTS_PROTECTED:` anchor does not double-match the same string in `CHARTER.md:74` prose; a fail-closed `undetermined` precedence applies on a missing base, undetermined flag, zero globs, or git failure; tests 9, 10, 11, 12 and 18 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #48. Test 9 (a 4th charter glob is honored with no code edit) is named in the issue as the strongest claim in the whole chain — that glob drift between charter and enforcement cannot recur. Two known residual limits (a truncating parse is visible but not detected; a malformed glob is a real unmitigated hole) are pinned as accepted, not fixed, per `factory-critic`'s review at gate 2. Same attended-session blocker.

## FQ-50: gates.sh slice 4 — base-ref override, and the 'full HEAD' bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-09-11 (re-derived; unchanged since 2026-08-31)
- repro: confirmed (verified during the spec: `./.claude/scripts/gates.sh full HEAD` on this repository today prints a plausible `base_source=<sha> protected=none`, indistinguishable from a legitimate run — the exact bypass this slice closes)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: a supplied base ref must pass ancestry, commit-existence and (on a clean tree) identity-against-HEAD checks or fall to `base_source=none`, never silently to auto-detection; tests 13, 14, 15 and 16 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #49. Closes a verified bypass permitted by the existing `Bash(./.claude/scripts/gates.sh:*)` allow-rule. Same attended-session blocker as the rest of the chain.

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-09-11 (re-derived; unchanged since 2026-08-31)
- repro: confirmed (verified in a throwaway repo during the spec: an add-only 5-line untracked change reports `code_lines=0` under `git diff --numstat` alone, which is exactly what every FQ-3-style add-only slice looks like)
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md, tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `code_lines_committed` reproduces Charter §7's own invocation exactly; `code_lines` additionally counts untracked additions so an add-only slice is measured correctly; `factory-verify/SKILL.md`'s "a mismatch is the finding" line is amended to exclude `code_lines`; tests 20–24 pass; no pre-existing test file is modified other than the named `SKILL.md` line; gates GREEN at `deep`
- confidence: high
- notes: **Deliberately droppable** — gate 1 approved the §7 ceiling measurement as independently reversible from the §3 enforcement in #46–#50; #23's `done_when` does not require this slice to merge. Touches two load-bearing files (`gates.sh` and a skill file), both needing the same attended-session approval as the rest of the chain.

---

## Needs a human spec run

## FQ-11: run the factory gates automatically on every push
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/11
- last_triaged: 2026-08-29 (not re-examined this run — unchanged since before the last recorded triage run)
- repro: not-attempted (no CI exists yet — nothing to reproduce)
- files_expected: .github/workflows/**
- load_bearing: true
- gate_level: deep
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Unchanged across every triage run since filing. `.github/workflows/**` is Charter §2 `LOAD_BEARING`, which Charter §4 `NEEDS_SPEC` names directly.

## FQ-12: record Slack delivery outcome so a dropped escalation is observable
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/12
- last_triaged: 2026-08-29 (not re-examined this run — unchanged since before the last recorded triage run)
- repro: confirmed (`src/service/purview.ts:727-736` swallows every bridge failure — read, not executed)
- files_expected: src/service/purview.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Unchanged across every triage run since filing. Product-intent decision (what gets recorded, whether delivery failure changes escalation behaviour) — Charter §4 `NEVER_AUTOMATE` names product intent directly.

## FQ-32: docs(factory) — four run records carry timestamps an hour off, minted from local time and labelled Z
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/32
- last_triaged: 2026-09-11 (re-derived; unchanged since 2026-09-01)
- repro: confirmed (each of the four named run records is anchored against an independent git or GitHub timestamp in the issue body)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md, docs/factory/runs/2026-08-30T235500Z-implement-8.md, docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md, docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever `.claude/skills/**` change an approved spec adds
- load_bearing: true
- gate_level: deep
- confidence: medium
- notes: Splits into an automatable half (appending a `## Timestamp correction` section to four immutable records, matching Charter §4 `AUTOMATABLE` "documentation and comment corrections") and a load-bearing half (a minting-rule change to skill files under `.claude/skills/**`). Filed as one issue; a spec or a human should decide whether to split it rather than triage narrowing scope unilaterally.

## FQ-33: a PR body's prose can silently close a queue item — two have already gone
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-11 (re-derived; unchanged since 2026-09-01)
- repro: confirmed (#28 closed by GitHub's closing-keyword scan inside PR #29's "Not done" prose, 2026-08-31; #26 shows the identical outcome with the mechanism unconfirmed)
- files_expected: docs/factory/specs/FQ-33/** (and whatever `.claude/skills/**` change an approved spec adds)
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: **Worth prioritizing first among the ready-to-spec items** — it is a live, already-confirmed defect (two queue items disappeared invisibly) rather than a design question, and the review queue is empty so nothing else competes for the human-attention budget. Touches `.claude/skills/**`, forcing `ready-to-spec` regardless of the eventual diff's size.

## FQ-40: workitem://{id}/tree is unreadable unless both depth and attention_only are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-11 (re-derived; unchanged since 2026-09-01)
- repro: confirmed (measured over the real transport: bare, `?depth=1` and `?attention_only=true` alone all return `Resource not found`; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- confidence: high
- notes: Changes a public MCP read surface (a resource template's URI-matching behavior), which Charter §4 `NEEDS_SPEC` names directly. Not on the `LOAD_BEARING` glob list, so `full` gates once specced, not `deep`.

## FQ-41: the claim protocol locks the branch, not the working tree
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-11 (re-derived; unchanged since 2026-09-01)
- repro: confirmed (observed 2026-08-31: creating `claude/fq-9` moved `HEAD` out from under a live run on #28 in the same checkout)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/** (and whatever the approved spec adds)
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: Touches the claim protocol itself (`CONTRACT.md`, `.claude/skills/factory-implement/**`), both Charter §2 `LOAD_BEARING`. Not urgent — nothing is currently broken on `main` — but real: the only reason the 2026-08-31 collision was caught was an incidental `git status`.

---

## Do not merge `archive/fq-5-slice0-original`

It is green and most of its lines are reused across the now-merged #5 and #18, but it *is*
the 515-line diff the Charter §7 ceiling stopped. It is a cherry-pick source only. Delete the
archive once its last consumer (already merged) is confirmed by a human read.
