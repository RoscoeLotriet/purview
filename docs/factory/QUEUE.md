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

_Snapshot rebuilt by `factory-triage` on 2026-09-18, superseding the `factory-spec` snapshot
of 2026-08-31 that is still on `main`. Live labels are the source of truth; that snapshot
predates the entire FQ-3 chain finishing (#38, #39, and the tracking issue #3 all closed —
see PRs #43, #44, #45) and the filing of the FQ-23 slice chain (#46–#51) and four new issues
(#32, #33, #40, #41)._

**This run changed no labels and no handoff comments.** All 13 open issues were re-examined
against `docs/factory/CONTRACT.md` and `docs/factory/CHARTER.md`; every existing label and
`factory-handoff:v1` comment already matches an independent re-derivation. Nothing on GitHub
has changed since 2026-09-02.

Counts: ready-to-implement=0, ready-to-spec=6 (#11, #12, #32, #33, #40, #41),
wait-to-implement=7 (#23, #46, #47, #48, #49, #50, #51), needs-info=0, awaiting-review=0.

**The queue is stalled, not unhealthy.** Every disposition below is correct; nothing is
mislabeled. What is missing is a human taking either of two actions — see the run record for
the full accounting of how long this has been true.

## Blocked on an attended human session (FQ-23 slice chain)

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically, not just in prose (parent)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-18 (re-confirmed; unchanged since factory-spec's 2026-09-01 re-derivation)
- repro: not-attempted (a design gap, not a reproducible bug — now specced)
- files_expected: (none — this is now the slice-chain tracking issue; each slice carries its own files_expected)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged (the mandatory slices that close the §3 enforcement hole); #51 is gate 1's deliberately droppable §7 line-ceiling slice and its non-merge does not block closing this item
- confidence: high
- notes: `factory-spec` ran this through all four gates, approved by a human on 2026-08-31, and filed slices #46–#51. Each slice is individually `wait-to-implement`, not `ready-to-spec` — the spec decision is already made.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-18 (re-confirmed; unchanged since 2026-09-02)
- repro: not-attempted (new test coverage plus a load-bearing script change, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts, tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: an attended human session claims this issue and approves the `.claude/scripts/gates.sh` edit in-session (Contract rule 2); once that happens, `./.claude/scripts/gates.sh full` prints a FACTORY_GATES line carrying `base_source=`, `protected_globs=` and `protected=`; `gates.sh fast` prints `base_source=not-measured protected=not-measured`; a bash older than 3.2 prints `misconfigured=unsupported-bash` and exits 2; the three tests pass, including one that runs the real `./.claude/scripts/gates.sh fast` in this repository and parses its line; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: **The one item in this repo with a documented failed unattended attempt.** An unattended run claimed this on 2026-09-01, correctly stopped at the `.claude/` edit-deny (Contract rule 2 plus `settings.json`'s `Edit`-deny on `gates.sh`), and self-corrected its own label from `ready-to-implement` — the flip that had been wrong — to what is now `wait-to-implement`. `factory-spec` already ran this to approval; re-specing would re-decide settled questions. It is waiting on a person being in the room, not on more thinking.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires: charter parse and real diff
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-09-18 (re-confirmed; unchanged since 2026-08-31)
- repro: not-attempted (specced load-bearing script change)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts, tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: modifying a pre-existing file matching a Charter §3 `TESTS_PROTECTED` glob makes `gates.sh full` report that file's path in `protected=` while `status` stays GREEN; adding a new file under the same glob reports `protected=none`; `protected_globs` equals the number of globs actually parsed from `docs/factory/CHARTER.md`; tests 1, 2, 3, 7 and 8 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: `blocked_on: #46` (slice 0 supplies the field plumbing and `resolve_base` this slice fills in). Pre-agreed split seam if it measures over the 400-line ceiling: land tests 1, 2, 3, 7 as this slice, take test 8 into slice 1b — do not trim a test to fit.

## FQ-48: gates.sh slice 2 — diff shape: deletion, rename, committed state, empty-pathspec guard
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-09-18 (re-confirmed; unchanged since 2026-08-31)
- repro: not-attempted (specced load-bearing script change)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: deleting a pre-existing protected file reports its path; renaming one away reports it; a modification that is already committed reports identically to an uncommitted one; a charter yielding zero globs never invokes `git diff` with an empty pathspec; tests 4, 5, 6 and 19 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: `blocked_on: #47` (refines `measure_protected`). Test 19 is the one guard against the check firing on every file when the charter parse yields zero globs.

## FQ-49: gates.sh slice 3 — charter fidelity: §3 flag, anchored parse, fail-closed degradation
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-09-18 (re-confirmed; unchanged since 2026-08-31)
- repro: not-attempted (specced load-bearing script change)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `TESTS_ARE_LOAD_BEARING: false` reports `protected=not-enforced`; a charter whose `TESTS_PROTECTED` block is absent or renamed reports `undetermined` and never `none`; a charter given a fourth glob reports `protected_globs=4` and reports a file matching only the new glob; a truncated block is visible in `protected_globs`; a deleted charter still produces a FACTORY_GATES line; tests 9, 10, 11, 12 and 18 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: `blocked_on: #47` (completes `parse_charter_section3`). Test 9 — charter drives behaviour with no second edit — is this slice's reason to exist; the rest is graceful degradation.

## FQ-50: gates.sh slice 4 — base-ref override, and the 'full HEAD' bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-09-18 (re-confirmed; unchanged since 2026-08-31)
- repro: not-attempted (specced load-bearing script change)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: a supplied base ref is used only when it resolves, is an ancestor of HEAD, and is not HEAD itself on a clean tree, reporting `base_source=arg`; any failure of those three reports `base_source=none` and `protected=undetermined` without falling back to auto-detection; `gates.sh full HEAD` on a clean tree reports `undetermined` and not `none`; tests 13, 14, 15 and 16 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: `blocked_on: #46` (adds `resolve_base`'s `$2` branch). Closes a bypass verified live against this repository during the spec session.

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-09-18 (re-confirmed; unchanged since 2026-08-31)
- repro: not-attempted (specced load-bearing script change)
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md, tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `gates.sh full` reports `code_lines=<n>` counting tracked changes and untracked non-documentation additions, plus `code_lines_committed=<n>` reproducing Charter §7's own invocation; `docs/**` and `**/*.md` are excluded from both; `code_lines` is `not-measured` at `fast` and `undetermined` when the base is undetermined; `.claude/skills/factory-verify/SKILL.md` states that `code_lines` is excluded from its "a mismatch is the finding" comparison; tests 20–24 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: medium
- notes: `blocked_on: #46`. Deliberately droppable — gate 1 approved the §7 ceiling as independently reversible from the §3 enforcement slices 0–4. Touches two load-bearing files (`gates.sh` and `factory-verify/SKILL.md`), so this run needs a human twice.

---

## Needs a human spec run

## FQ-11: run the factory gates automatically on every push
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/11
- last_triaged: 2026-09-18 (re-confirmed; unchanged since 2026-08-31)
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
- last_triaged: 2026-09-18 (re-confirmed; unchanged since 2026-08-31)
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
- last_triaged: 2026-09-18 (re-confirmed; unchanged since 2026-09-01)
- repro: confirmed (issue body anchors each of the four records against a git/GitHub timestamp)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md, docs/factory/runs/2026-08-30T235500Z-implement-8.md, docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md, docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever `.claude/skills/**` change the approved spec adds for the minting rule
- load_bearing: true
- gate_level: deep
- done_when: a spec exists (or an explicit scope decision) separating the docs-only correction from the skill-minting-rule change, approved through factory-spec's human gates
- confidence: medium
- notes: Splits into an `AUTOMATABLE` docs-correction half and a `.claude/skills/**` `LOAD_BEARING` half; filed as one issue, so narrowing scope is a human or spec decision, not triage's to make.

## FQ-33: a PR body's prose can silently close a queue item — two have already gone
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-18 (re-confirmed; unchanged since 2026-09-01)
- repro: confirmed (#28 closed by PR #29's body; mechanism documented)
- files_expected: docs/factory/specs/FQ-33/** (and whatever `.claude/skills/**` change the approved spec adds)
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding where the PR-body closing-keyword prohibition and its mechanical pre-`gh pr create` check live, and whether an implement run should ever write a closing keyword against a queue issue at all — approved through factory-spec's human gates
- confidence: high
- notes: Touches `.claude/skills/factory-implement/**` at minimum — Charter §2 `LOAD_BEARING`. Worth prioritizing: the review queue is empty, so nothing else competes for the human-attention budget this would spend.

## FQ-40: `workitem://{id}/tree` is unreadable unless both `depth` and `attention_only` are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-18 (re-confirmed; unchanged since 2026-09-01)
- repro: confirmed (measured over the real transport: bare, `?depth=1` and `?attention_only=true` all return `Resource not found`; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists deciding whether `depth`/`attention_only` should be individually optional, whether a more specific error is warranted, or whether the resource description should just state the requirement — approved through factory-spec's human gates
- confidence: high
- notes: Changes a public MCP read surface — Charter §4 `NEEDS_SPEC` names this directly. Not `LOAD_BEARING`, so `full` gates once specced, not `deep`.

## FQ-41: the claim protocol locks the branch, not the working tree
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-18 (re-confirmed; unchanged since 2026-09-01)
- repro: confirmed (observed 2026-08-31: creating `claude/fq-9` moved `HEAD` out from under a live run on #28 in the same checkout)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/** (and whatever the approved spec adds)
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding whether an implement run must isolate its checkout, how a run detects it is not alone before switching branches, what a run does on detected contention, and whether the clean-checkout requirement becomes a first-class precondition of the claim protocol — approved through factory-spec's human gates
- confidence: high
- notes: Touches `CONTRACT.md`'s claim protocol itself — an agent must not rewrite its own constraints, so this cannot be specced or implemented unattended regardless of size. Not urgent (nothing is currently broken on `main`), but real.

---

## Resolved since the last snapshot on `main`

- **FQ-3** (integration suite, parent) and its remaining slices **#38** and **#39** are all
  merged and closed — the FQ-3 chain is complete (PRs #43, #44; status closed out in #45).
- `archive/fq-5-slice0-original` no longer exists as a remote branch. The "do not merge"
  note this file used to carry for it no longer applies.
