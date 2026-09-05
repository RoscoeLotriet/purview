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

_Snapshot rebuilt by `factory-triage` on 2026-09-05, superseding the `factory-spec` snapshot
of 2026-08-31 (gate 4 revision 3). Live labels are the source of truth._

**This was a confirming run, not a reclassifying one.** 13 open issues; 11 qualified for
re-examination (updated since the prior triage run's `2026-08-31T06:08:15Z` finish — none
were untriaged, every open issue already carries a `factory:` state label). 0 skipped
(cap is 20). Every one of the 11 was independently re-derived against `CONTRACT.md` and
`CHARTER.md` rather than taken on the existing label's word, and every re-derivation agreed
with the disposition already in place. **No GitHub label changed. No handoff comment was
added or superseded** — each issue's existing `factory-handoff:v1` comment already reflects
the current, correct state, most as recently as 2026-09-01/2026-09-02. #2 and #12 were not
re-examined (last updated 2026-08-29, before the cutoff); their entries below carry forward
unchanged.

Counts: ready-to-implement=0, ready-to-spec=6 (#11, #12, #32, #33, #40, #41),
wait-to-implement=8 (#3, #23, #46, #47, #48, #49, #50, #51), awaiting-review=0,
needs-info=0.

**The queue currently has zero claimable work.** Every open item is either parked behind a
human spec decision or behind an attended human session (the FQ-23 `gates.sh` chain — see
below). The review queue is empty, so Charter §7's "more than 3 items awaiting human review"
stop condition is not in play; the bottleneck right now is human *spec and session* time, not
review capacity.

## Claimable now

_(none)_

---

## FQ-23 slice chain — blocked on an attended human session

Every slice below edits `.claude/scripts/gates.sh` (Charter §2 `LOAD_BEARING`, `Edit`-denied
in `.claude/settings.json`). `factory-spec` already took FQ-23 through all four gates and a
human approved the design on 2026-08-31 — the spec decision this chain needed has been made.
What remains is not more thinking, it is a human present in session to approve each
`.claude/` edit per Contract rule 2. An unattended run cannot complete any of these; one
already tried, self-corrected, and left a comment saying so (see #46).

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically (parent, tracking)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-05 (re-derived, unchanged)
- repro: not-attempted (a design gap, not a reproducible bug; spec already approved)
- files_expected: (none — tracking issue; each slice carries its own)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged; #51 is gate 1's deliberately droppable §7 line-ceiling slice and its non-merge does not block closing this item
- confidence: high
- notes: Confirmed unchanged. Six slice issues (#46–#51) exist, each with its own current handoff. None can proceed unattended — see the chain note above.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-05 (re-derived, unchanged)
- repro: not-attempted (spec already approved; nothing to reproduce pre-implementation)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts, tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: an attended human session claims this issue and approves the `.claude/scripts/gates.sh` edit in-session (Contract rule 2); `gates.sh full` prints `base_source=`, `protected_globs=`, `protected=`; `gates.sh fast` prints `base_source=not-measured protected=not-measured`; a bash older than 3.2 prints `misconfigured=unsupported-bash` and exits 2; the three tests pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Originally triaged `ready-to-implement` on 2026-08-31; an unattended implement run correctly stopped at the charter check on 2026-09-01, self-corrected to `ready-to-spec`, then flagged that label as a misdescription since the spec is already done. A later correction moved it to `wait-to-implement`, which this run confirms is the right fit: "understood and valid, but blocked... on a decision not yet made" describes a human choosing to sit in session exactly. This history is worth reading before re-promoting this issue — it is not automatable regardless of how the label reads.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires: charter parse and real diff
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-09-05 (re-derived, unchanged)
- repro: not-attempted (spec already approved)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts, tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: modifying a pre-existing file matching a Charter §3 TESTS_PROTECTED glob makes `gates.sh full` report that file's path in `protected=` while `status` stays GREEN; adding a new file under the same glob reports `protected=none`; `protected_globs` equals the number of globs actually parsed from `docs/factory/CHARTER.md`; tests 1, 2, 3, 7 and 8 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #46 (slice 0 — the field plumbing this slice fills in), same as before. Carries a pre-agreed split seam (land tests 1/2/3/7, defer test 8 to 1b) if it measures over the Charter §7 ceiling.

## FQ-48: gates.sh slice 2 — diff shape: deletion, rename, committed state, empty-pathspec guard
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-09-05 (re-derived, unchanged)
- repro: not-attempted (spec already approved)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: deleting a pre-existing protected file reports its path; renaming one away reports it; a modification that is already committed reports identically to an uncommitted one; a charter yielding zero globs never invokes `git diff` with an empty pathspec; tests 4, 5, 6 and 19 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #47 (slice 1 — `measure_protected`, which this slice refines).

## FQ-49: gates.sh slice 3 — charter fidelity: §3 flag, anchored parse, fail-closed degradation
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-09-05 (re-derived, unchanged)
- repro: not-attempted (spec already approved)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `TESTS_ARE_LOAD_BEARING: false` reports `protected=not-enforced`; a charter whose TESTS_PROTECTED block is absent or renamed reports `undetermined` and never `none`; a charter given a fourth glob reports `protected_globs=4` and reports a file matching only the new glob; a truncated block is visible in `protected_globs`; a deleted charter still produces a FACTORY_GATES line; tests 9, 10, 11, 12 and 18 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #47 (slice 1 — `parse_charter_section3`, which this slice completes). Test 9 is the slice's reason to exist.

## FQ-50: gates.sh slice 4 — base-ref override, and the 'full HEAD' bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-09-05 (re-derived, unchanged)
- repro: not-attempted (spec already approved; the bypass itself was confirmed during the spec)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: a supplied base ref is used only when it resolves, is an ancestor of HEAD, and is not HEAD itself on a clean tree, reporting `base_source=arg`; any failure of those three reports `base_source=none` and `protected=undetermined` without falling back to auto-detection; `gates.sh full HEAD` on a clean tree reports `undetermined` and not `none`; tests 13, 14, 15 and 16 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #46 (slice 0 — `resolve_base`, whose `$2` branch this slice adds).

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-09-05 (re-derived, unchanged)
- repro: not-attempted (spec already approved)
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md, tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `gates.sh full` reports `code_lines=<n>` counting tracked changes and untracked non-documentation additions, plus `code_lines_committed=<n>` reproducing Charter §7's own invocation; `docs/**` and `**/*.md` are excluded from both; `code_lines` is `not-measured` at `fast` and `undetermined` when the base is undetermined; `.claude/skills/factory-verify/SKILL.md` states that `code_lines` is excluded from its "a mismatch is the finding" comparison; tests 20, 21, 22, 23 and 24 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: medium
- notes: blocked_on #46. Deliberately droppable — slices 0–4 close the §3 hole and stand alone without it. Touches two load-bearing files, not one.

---

## FQ-3: integration suite covering the step-1 seams (parent)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/3
- last_triaged: 2026-08-31
- repro: not-attempted (tracking issue, no code of its own)
- files_expected: (none — tracking issue)
- load_bearing: false
- gate_level: full
- done_when: all of #5, #18, #6, #7, #8, #10, #26, #28, #38, #39 merged
- confidence: high
- notes: Not re-examined this run (unchanged since 2026-08-31). All ten slices merged per the prior snapshot's tracking — worth a human confirming this can close.

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
- notes: Not re-examined this run (not updated since the prior triage cutoff). `.github/workflows/**` is Charter §2 `LOAD_BEARING`, which Charter §4 `NEEDS_SPEC` names directly.

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
- notes: Not re-examined this run (not updated since the prior triage cutoff). Product-intent decision — Charter §4 `NEVER_AUTOMATE` names product intent directly.

## FQ-32: four run records carry timestamps an hour off, minted from local time and labelled Z
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/32
- last_triaged: 2026-09-05 (re-derived, unchanged)
- repro: confirmed (each of the four timestamps is anchored to a git or GitHub timestamp in the issue body)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md, docs/factory/runs/2026-08-30T235500Z-implement-8.md, docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md, docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever `.claude/skills/**` change the approved spec adds for the minting rule
- load_bearing: true
- gate_level: deep
- done_when: a spec exists (or an explicit scope decision) separating the docs-only correction from the skill-minting-rule change, and is approved through factory-spec's human gates
- confidence: medium
- notes: Splits into an `AUTOMATABLE` half (appending dated corrections to four immutable run records) and a `NEEDS_SPEC` half (the minting-rule fix lives in `.claude/skills/**`, Charter §2 `LOAD_BEARING`). Filed as one issue; triage does not have standing to split it unilaterally, which is exactly the "scope needs deciding" case `ready-to-spec` exists for.

## FQ-33: a PR body's prose can silently close a queue item — two have already gone
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-05 (re-derived, unchanged)
- repro: confirmed (#28 closed by PR #29's body containing a closing-keyword sentence; #26's mechanism unconfirmed)
- files_expected: docs/factory/specs/FQ-33/** (and whatever `.claude/skills/**` change the approved spec adds)
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding where the PR-body closing-keyword prohibition and its mechanical pre-`gh pr create` check live, and whether an implement run should ever be allowed to write a closing keyword against a queue issue at all — approved through factory-spec's human gates
- confidence: high
- notes: Touches `.claude/skills/factory-implement/**` at minimum, Charter §2 `LOAD_BEARING`. Two queue items (#28, possibly #26) already lost to this mechanism; review queue is empty, so nothing competes for the human-attention budget this would spend.

## FQ-40: workitem://{id}/tree is unreadable unless both depth and attention_only are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-05 (re-derived, unchanged)
- repro: confirmed (measured over the real transport: bare, `?depth=1` and `?attention_only=true` all return `Resource not found`; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists deciding (1) whether the two variables should be individually optional, (2) whether an unmatched-but-plausible URI should return a more specific error than "not found", and (3) whether the resource description should instead just state the requirement — approved through factory-spec's human gates
- confidence: high
- notes: Changes a public MCP read surface (a resource template's URI-matching behaviour) — Charter §4 `NEEDS_SPEC` names this directly. Not on the `LOAD_BEARING` glob list, so `full` gates once specced, not `deep`.

## FQ-41: the claim protocol locks the branch, not the working tree
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-05 (re-derived, unchanged)
- repro: confirmed (observed 2026-08-31: creating `claude/fq-9` moved `HEAD` out from under a live run on #28 in the same checkout)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/** (and whatever the approved spec adds)
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding whether an implement run must isolate its checkout, how a run detects it is not alone before switching branches, what a run does on detected contention, and whether `factory-verifier`'s clean-checkout requirement becomes a first-class precondition of the claim protocol — approved through factory-spec's human gates
- confidence: high
- notes: Touches the claim protocol itself (`CONTRACT.md` and `.claude/skills/factory-implement/**`), Charter §2 `LOAD_BEARING`. Not urgent — nothing currently broken on `main` — but real: two concurrent local runs collided silently and were caught by chance.

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically, not just in prose

_(entry moved — see "FQ-23 slice chain" above; the spec this item asked for has already been approved and split into slices #46–#51, so this is now a tracking parent rather than a spec-pending item.)_

---

## Do not merge `archive/fq-5-slice0-original`

It is green and most of its lines are reused across the now-merged #5 and #18, but it *is*
the 515-line diff the Charter §7 ceiling stopped. It is a cherry-pick source only. Delete the
archive once its last consumer (already merged) is confirmed by a human read.
