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

_Snapshot rebuilt by `factory-triage` on 2026-09-02, superseding the `factory-triage`
snapshot proposed in the still-open PR #52 (2026-09-01) and the `factory-spec` snapshot of
2026-08-31 before it. Live labels are the source of truth._

PR #52 already covers 12 of these 13 open issues correctly — this run re-verified rather than
retriaging them wholesale. The one exception is #46: an unattended implement run claimed it
after PR #52 was opened, correctly refused to edit `.claude/scripts/gates.sh` unattended, and
flipped its label to `factory:ready-to-spec` — a label its own comment said was "the routed
label, not the real blocker," since #46 was already fully specced. This run moved #46 to
`factory:wait-to-implement` to match its already-correctly-labeled siblings #47–#51, all
blocked on the identical constraint (an attended session to approve a `.claude/` edit). See
`docs/factory/runs/2026-09-02T060523Z-triage-run.md` for the full account.

13 open issues total, 0 skipped (cap is 20). 0 issues were untriaged. 1 issue (#46) had
changed since the prior triage run recorded in `docs/factory/runs/2026-09-01T062132Z-triage-run.md`
(`finished_at: 2026-09-01T06:21:32Z`, PR #52, not yet merged); the other 12 were confirmed
against live GitHub state and carried forward unchanged.

Counts: ready-to-implement=0, ready-to-spec=6 (#11, #12, #32, #33, #40, #41),
wait-to-implement=7 (#23, #46, #47, #48, #49, #50, #51), needs-info=0, awaiting-review=0.

**Nothing is claimable by an unattended run right now.** Every FQ-23 slice, including the
first one (#46), needs a human in session to approve its edit to `.claude/scripts/gates.sh`.

## Blocked on FQ-23's own slices

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically, not just in prose (parent)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-01 (confirmed unchanged 2026-09-02)
- repro: not-attempted (tracking issue, no code of its own)
- files_expected: (none — tracking issue; each slice carries its own)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged; #51 is gate 1's deliberately droppable §7 line-ceiling slice and does not block closing this item
- confidence: high
- notes: Unchanged this run. A `factory-spec` run took this through all four gates on 2026-08-31 and filed slices #46–#51.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-02
- repro: not-attempted (new tracer coverage, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts, tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: an attended human session claims this and approves the `.claude/scripts/gates.sh` edit in-session (Contract rule 2); once that happens, `./.claude/scripts/gates.sh full` prints a FACTORY_GATES line carrying `base_source=`, `protected_globs=` and `protected=`; `gates.sh fast` prints `base_source=not-measured protected=not-measured`; a bash older than 3.2 prints `misconfigured=unsupported-bash` and exits 2; the three tests pass, including one that runs the real `./.claude/scripts/gates.sh fast` in this repository and parses its line; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: **Moved this run** from `factory:ready-to-spec` to `factory:wait-to-implement`. An unattended implement run claimed it 2026-09-01, correctly refused the `.claude/` edit per Contract rule 2, and self-corrected the label — but its own comment named `wait-to-implement` (matching #47–#51) as the better fit, since nothing about scope is undecided. Triage concurs. #47, #49 and #50 are each blocked on this slice; #48 is blocked on #47.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires: charter parse and real diff
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-09-01 (confirmed unchanged 2026-09-02)
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts, tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: tests 1, 2, 3, 7 and 8 pass (pre-agreed seam: land 1/2/3/7 and defer test 8 plus the glob-echo to slice 1b if this measures over the Charter §7 ceiling — do not trim a test to fit); `protected_globs` matches the charter's real glob count; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #46 (needs the field plumbing and `resolve_base` slice 0 adds). Unchanged this run.

## FQ-48: gates.sh slice 2 — diff shape: deletion, rename, committed state, empty-pathspec guard
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-09-01 (confirmed unchanged 2026-09-02)
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: tests 4, 5, 6 and 19 pass (test 19 guards the zero-glob empty-pathspec case — the only test in FQ-23 covering it); no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #47 (refines `measure_protected`, which slice 1 introduces). Unchanged this run.

## FQ-49: gates.sh slice 3 — charter fidelity: §3 flag, anchored parse, fail-closed degradation
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-09-01 (confirmed unchanged 2026-09-02)
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: tests 9, 10, 11, 12 and 18 pass (test 9 — a fourth charter glob is honoured with no second edit — is the slice's reason to exist; test 18 is the anti-catastrophe case, charter deleted, line still prints); no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #47 (completes `parse_charter_section3`). Unchanged this run.

## FQ-50: gates.sh slice 4 — base-ref override, and the 'full HEAD' bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-09-01 (confirmed unchanged 2026-09-02)
- repro: confirmed (`./.claude/scripts/gates.sh full HEAD` verified against this repository during the spec to print a plausible, empty-diff report — the exact bypass this slice closes)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: tests 13, 14, 15 and 16 pass; a supplied base ref is used only when it resolves, is an ancestor of HEAD, and is not HEAD itself on a clean tree — any failure reports `base_source=none` with no fallthrough to auto-detection; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #46 (`resolve_base`'s `$2` branch is this slice's addition to slice 0's function). Unchanged this run.

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-09-01 (confirmed unchanged 2026-09-02)
- repro: confirmed (`git diff --numstat` verified to miss untracked additions entirely during the spec — an add-only 5-line change measured `code_lines=0`; FQ-3 slice 2a landed at 398/400 lines and would have measured 0)
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md, tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: tests 20–24 pass; `code_lines` counts tracked and untracked non-doc additions, `code_lines_committed` reproduces Charter §7's own command; both are excluded from `factory-verify/SKILL.md`'s "a mismatch is the finding" comparison; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: medium
- notes: Blocked on #46 (`resolve_base` and field plumbing). Deliberately droppable — gate 1 approved the §7 ceiling as independently reversible from the §3 hole slices 0–4 close. Unchanged this run.

---

## Needs a human spec run

## FQ-11: run the factory gates automatically on every push
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/11
- last_triaged: 2026-08-31 (not re-examined — unchanged since prior triage)
- repro: not-attempted (no CI exists yet — nothing to reproduce)
- files_expected: .github/workflows/**
- load_bearing: true
- gate_level: deep
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Unchanged. `.github/workflows/**` is Charter §2 `LOAD_BEARING`, which Charter §4 `NEEDS_SPEC` names directly.

## FQ-12: record Slack delivery outcome so a dropped escalation is observable
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/12
- last_triaged: 2026-08-31 (not re-examined — unchanged since prior triage)
- repro: confirmed (`src/service/purview.ts:727-736` swallows every bridge failure — read, not executed)
- files_expected: src/service/purview.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Unchanged. Product-intent decision (what gets recorded, whether delivery failure changes escalation behaviour) — Charter §4 `NEVER_AUTOMATE` names product intent directly.

## FQ-32: four run records carry timestamps an hour off, minted from local time and labelled Z
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/32
- last_triaged: 2026-09-01 (confirmed unchanged 2026-09-02)
- repro: confirmed (issue anchors each of the four records to an independent git/GitHub timestamp; the direction of the error is inconsistent across them)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md, docs/factory/runs/2026-08-30T235500Z-implement-8.md, docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md, docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever `.claude/skills/**` change the approved spec adds
- load_bearing: true
- gate_level: deep
- confidence: medium
- notes: Splits into a docs-only correction (Charter §4 AUTOMATABLE) and a skill-minting-rule change under `.claude/skills/**` (Charter §2 LOAD_BEARING, forcing NEEDS_SPEC). Filed as one issue covering both, so the split itself is the scope decision `ready-to-spec` exists for. Unchanged this run.

## FQ-33: a PR body's prose can silently close a queue item — two have already gone
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-01 (confirmed unchanged 2026-09-02)
- repro: confirmed (#28 closed by PR #29's body containing a closing keyword + `#28`; #26 shows the same outcome, mechanism unconfirmed)
- files_expected: docs/factory/specs/FQ-33/** (and whatever `.claude/skills/**` change the approved spec adds)
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: Touches skill files that compose PR bodies — Charter §2 LOAD_BEARING. Worth prioritizing: review queue is empty, and the defect has already cost two queue items. Unchanged this run.

## FQ-40: workitem://{id}/tree is unreadable unless both depth and attention_only are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-01 (confirmed unchanged 2026-09-02)
- repro: confirmed (measured over the real transport: bare, `?depth=1` and `?attention_only=true` all return `Resource not found`; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- confidence: high
- notes: Changes a public MCP read surface — Charter §4 NEEDS_SPEC. Unchanged this run.

## FQ-41: the claim protocol locks the branch, not the working tree
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-01 (confirmed unchanged 2026-09-02)
- repro: confirmed (observed 2026-08-31: creating `claude/fq-9` moved `HEAD` out from under a live run on #28 in the same checkout)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/**
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: Touches the contract's claim protocol and `.claude/skills/factory-implement/**` — Charter §2 LOAD_BEARING. Not urgent (nothing broken on `main` today), but real. Unchanged this run.
