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

_Snapshot rebuilt by `factory-triage` on 2026-09-13, from live GitHub state, superseding the
`factory-spec` snapshot of 2026-08-31 still on `main`. Live labels are the source of truth._

**Nothing changed this run.** All 13 open issues already carried the correct `factory:`
label and a current `factory-handoff:v1` comment; each was independently re-derived against
`docs/factory/CONTRACT.md` and `docs/factory/CHARTER.md` rather than taken on faith, and
every re-derivation matched what was already live. No GitHub label changed. No new handoff
comment was posted.

Counts: ready-to-implement=0, ready-to-spec=6 (#11, #12, #32, #33, #40, #41),
wait-to-implement=7 (#23, #46, #47, #48, #49, #50, #51), needs-info=0, awaiting-review=0.

**The queue has been in this exact state for 13 days.** See "Queue is stalled, not empty"
below — this is the highest-value thing in this snapshot for a human to read.

## Blocked — attended human session required

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically (parent)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-13 (re-derived; unchanged since 2026-09-01)
- repro: not-attempted (tracking issue, no code of its own)
- files_expected: (none — this issue is the slice-chain tracking issue)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged (the mandatory slices that close the §3 enforcement hole); #51 is gate 1's deliberately droppable §7 line-ceiling slice and its non-merge does not block closing this item
- confidence: high
- notes: Fully specced and human-approved 2026-08-31 (`docs/factory/specs/FQ-23/`). Every slice's edit surface is `.claude/scripts/gates.sh`, which is Charter §2 `LOAD_BEARING` and `Edit`-denied in `.claude/settings.json` for unattended runs. Verified rather than assumed: an unattended implement run claimed #46 on 2026-09-01, correctly refused to edit the file, and self-corrected its own routed label — see #46's history.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-13 (re-derived; unchanged since 2026-09-02)
- repro: not-attempted (spec work, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts, tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: an attended human session claims this issue and approves the `.claude/scripts/gates.sh` edit in-session (Contract rule 2); once that happens, `gates.sh full` prints a FACTORY_GATES line carrying `base_source=`, `protected_globs=` and `protected=`; `gates.sh fast` prints `base_source=not-measured protected=not-measured`; a bash older than 3.2 prints `misconfigured=unsupported-bash` and exits 2; tests 17 and 26 (plus the tracer test) pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: First slice in the chain; blocks #47, #49 and #50. Not `ready-to-spec` despite the routed label an earlier implement run's self-correction produced — the scope is fully decided, the blocker is a human sitting in an attended session, which is what `wait-to-implement` means.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-09-13 (re-derived; unchanged since 2026-08-31)
- repro: not-attempted (spec work, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts, tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: modifying a pre-existing file matching a Charter §3 TESTS_PROTECTED glob makes `gates.sh full` report that file's path in `protected=` while `status` stays GREEN; adding a new file under the same glob reports `protected=none`; `protected_globs` equals the number of globs actually parsed from `docs/factory/CHARTER.md`; tests 1, 2, 3, 7 and 8 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #46. Pre-agreed split seam if this overruns the 400-line ceiling: land tests 1, 2, 3, 7 as this slice, take test 8 and the glob-echo as slice 1b — do not trim a test to fit.

## FQ-48: gates.sh slice 2 — diff shape
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-09-13 (re-derived; unchanged since 2026-08-31)
- repro: not-attempted (spec work, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: deleting a pre-existing protected file reports its path; renaming one away reports it; a committed modification reports identically to an uncommitted one; a charter yielding zero globs never invokes `git diff` with an empty pathspec; tests 4, 5, 6 and 19 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #47.

## FQ-49: gates.sh slice 3 — charter fidelity
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-09-13 (re-derived; unchanged since 2026-08-31)
- repro: not-attempted (spec work, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `TESTS_ARE_LOAD_BEARING: false` reports `protected=not-enforced`; a missing/renamed TESTS_PROTECTED block reports `undetermined`, never `none`; a charter given a 4th glob reports `protected_globs=4` and catches a file matching only it; a truncated block is visible in `protected_globs`; a deleted charter still prints a FACTORY_GATES line; tests 9, 10, 11, 12 and 18 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #47. Test 9 is this slice's reason to exist — proves the charter is the single source of the rule.

## FQ-50: gates.sh slice 4 — base-ref override, bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-09-13 (re-derived; unchanged since 2026-08-31)
- repro: not-attempted (spec work, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: a supplied base ref is used only when it resolves, is an ancestor of HEAD, and is not HEAD itself on a clean tree (`base_source=arg`); any failure reports `base_source=none` and `protected=undetermined` without falling back to auto-detection; `gates.sh full HEAD` on a clean tree reports `undetermined`, not `none`; tests 13, 14, 15 and 16 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #46. Closes a verified bypass (`gates.sh full HEAD` currently prints a plausible clean report on zero diff).

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-09-13 (re-derived; unchanged since 2026-08-31)
- repro: not-attempted (spec work, not a bug report)
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md, tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `gates.sh full` reports `code_lines=<n>` (tracked + untracked non-doc additions) and `code_lines_committed=<n>` (Charter §7's own invocation); both exclude `docs/**` and `**/*.md`; `not-measured` at `fast`, `undetermined` when the base is undetermined; `factory-verify/SKILL.md` states `code_lines` is excluded from its exact-match mismatch check; tests 20-24 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: medium
- notes: blocked_on #46. Deliberately droppable per gate 1 — #23 can close without this slice merging. Touches two load-bearing files, so needs two human approvals in-session.

---

## Needs a human spec run

## FQ-11: run the factory gates automatically on every push
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/11
- last_triaged: 2026-09-13 (re-derived; unchanged since 2026-08-29)
- repro: not-attempted (no CI exists yet — nothing to reproduce)
- files_expected: .github/workflows/**
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding gate level per path, whether the check is required for merge, whether the integration suite runs in CI, and runner/Node version — approved through factory-spec's human gates
- confidence: medium
- notes: Unchanged this run. `.github/workflows/**` is Charter §2 `LOAD_BEARING`, which Charter §4 `NEEDS_SPEC` names directly.

## FQ-12: record Slack delivery outcome so a dropped escalation is observable
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/12
- last_triaged: 2026-09-13 (re-derived; unchanged since 2026-08-29)
- repro: confirmed (`src/service/purview.ts:727-738` swallows every bridge failure — read, not executed)
- files_expected: src/service/purview.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec decides what delivery outcome is recorded, who/how it surfaces, whether failure should change escalation behaviour, and whether this is v0 scope at all — approved through factory-spec's human gates; FQ-3 slice 3's test 15 is then inverted from placeholder to acceptance test
- confidence: medium
- notes: Unchanged this run. Product-intent decision — Charter §4 `NEVER_AUTOMATE` names product intent directly.

## FQ-32: four run records carry timestamps an hour off
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/32
- last_triaged: 2026-09-13 (re-derived; unchanged since 2026-09-01)
- repro: confirmed (each of the four records anchored against git/GitHub timestamps in the issue body)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md, docs/factory/runs/2026-08-30T235500Z-implement-8.md, docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md, docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever `.claude/skills/**` change the approved spec adds for the minting rule
- load_bearing: true
- gate_level: deep
- done_when: a spec exists (or an explicit scope decision) separating the docs-only correction from the skill-minting-rule change, and is approved through factory-spec's human gates
- confidence: medium
- notes: Unchanged this run. The docs-only half matches Charter §4 `AUTOMATABLE`; the minting-rule half touches `.claude/skills/**`, Charter §2 `LOAD_BEARING`. Filed as one issue, so splitting it is a spec/human decision, not triage's to make.

## FQ-33: a PR body's prose can silently close a queue item
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-13 (re-derived; unchanged since 2026-09-01)
- repro: confirmed (#28 closed by PR #29's body on merge 2026-08-31; #26 same outcome, mechanism unconfirmed)
- files_expected: docs/factory/specs/FQ-33/** (and whatever `.claude/skills/**` change the approved spec adds)
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding where the PR-body closing-keyword prohibition and its mechanical pre-`gh pr create` check live, and whether an implement run should ever write a closing keyword against a queue issue at all — approved through factory-spec's human gates
- confidence: high
- notes: Unchanged this run. Worth prioritizing: two queue items already silently closed by this mechanism, and the review queue is empty so nothing competes for the attention budget.

## FQ-40: workitem://{id}/tree is unreadable unless both query variables are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-13 (re-derived; unchanged since 2026-09-01)
- repro: confirmed (measured over the real transport: bare, `?depth=1`, `?attention_only=true` all return `Resource not found`; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists deciding whether the two variables should be individually optional, whether an unmatched-but-plausible URI should return a more specific error, and whether the resource description should just state the requirement instead — approved through factory-spec's human gates
- confidence: high
- notes: Unchanged this run. Changes a public MCP read surface — Charter §4 `NEEDS_SPEC`.

## FQ-41: the claim protocol locks the branch, not the working tree
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-13 (re-derived; unchanged since 2026-09-01)
- repro: confirmed (observed 2026-08-31: two local runs in one checkout collided when `git switch` moved HEAD out from under a live session)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/** (and whatever the approved spec adds)
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding whether an implement run must isolate its checkout, how a run detects contention before switching, what a run does on detected contention, and whether factory-verifier's clean-checkout requirement becomes a first-class precondition of the claim protocol — approved through factory-spec's human gates
- confidence: high
- notes: Unchanged this run. Touches the claim protocol itself — Charter §2 says an agent must not rewrite its own constraints.

---

## Queue is stalled, not empty

**This is the fourteenth consecutive scheduled `factory-triage` run to find zero label
changes and zero new handoff comments** (PRs #52 through #63, 2026-09-01 through
2026-09-12, all still open and unmerged; this is #64). Every run independently re-derived
every disposition against the charter and reached the same answer already live on GitHub.
The queue is not idle for lack of work — it is idle because every open item is blocked on a
human:

- The FQ-23 `gates.sh` chain (7 issues) is fully specced and human-approved, but every
  slice edits `.claude/scripts/gates.sh`, which is `Edit`-denied for unattended runs.
  Contract rule 2 requires a human present in session to approve each edit. No amount of
  further triage or spec work changes this.
- The 6 `ready-to-spec` items are waiting on a human running `factory-spec`. #33 (the
  PR-body silent-close defect) is worth prioritizing — it has already cost two queue items
  and the review queue is empty, so nothing competes for the attention budget.

## Charter compliance gap, carried forward

Five label/comment changes on #23/#46 between 2026-08-31 evening and 2026-09-02 have no
corresponding file under `docs/factory/runs/` on `main` — they were produced by routines
whose branches never merged. Every one of those dispositions has since been independently
re-derived and confirmed correct by twelve subsequent triage runs, so nothing is currently
mislabeled, but the durable-evidence trail the contract requires has a real gap for that
window. `docs/factory/CONTRACT.md` and the triage skill do not say what a routine should do
when its own prior output piles up unmerged for two weeks — recorded as a charter gap, not
decided here.

---

## Do not merge `archive/fq-5-slice0-original`

It is green and most of its lines are reused across the now-merged #5 and #18, but it *is*
the 515-line diff the Charter §7 ceiling stopped. It is a cherry-pick source only. Delete the
archive once its last consumer (already merged) is confirmed by a human read.
