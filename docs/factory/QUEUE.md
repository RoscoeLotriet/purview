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

_Snapshot rebuilt by `factory-triage` on 2026-09-16, superseding the `factory-spec` snapshot of
2026-08-31 (gate 4 revision 3). Live labels are the source of truth._

**Full re-derivation, not a delta.** The version of this file on `main` predates the entire
FQ-3 chain finishing and the entire FQ-23 chain existing, and would read as current when it is
not. Since the prior snapshot: `#3` (the FQ-3 parent) and all ten of its slices — `#5, #6, #7,
#8, #9, #10, #18, #26, #28, #38, #39` — closed; every one merged to `main`. Six new issues
opened and were triaged before this run without a matching `docs/factory/runs/` record (see
"Run-record gap" in this run's record under `docs/factory/runs/`): `#32`, `#33`, `#40`, `#41`
on 2026-09-01, and `#23` was re-specced and split into six `gates.sh` slices (`#23` itself plus
new issues `#46`–`#51`) on 2026-08-31/09-01, with `#46` additionally cycled through an
unattended implement-run stop on 2026-09-02.

This run queried GitHub directly and re-derived every open issue's disposition against
`CHARTER.md` rather than trusting the labels or the existing `factory-handoff:v1` comments.
**All 13 open issues already carried a state label** (0 untriaged). **11 of 13 had been
updated since the prior triage run's `finished_at` (2026-08-31T06:08:15Z)** and were
re-examined in full; `#11` and `#12` had not changed and were not re-examined, per the skill's
scope rule. Cap is 20; nothing was skipped.

**Every re-examined disposition matched its existing label and handoff comment exactly.** No
label changes, no handoff-comment updates, and no reclassifications this run — see the run
record for the per-issue derivation.

Counts: ready-to-implement=0, ready-to-spec=6 (#11, #12, #32, #33, #40, #41),
wait-to-implement=7 (#23, #46, #47, #48, #49, #50, #51), needs-info=0, awaiting-review=0.

**The review queue is empty**, so no item is held back by Charter §7's cap of three.

## Needs a human spec run

## FQ-11: run the factory gates automatically on every push
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/11
- last_triaged: 2026-08-31 (not re-examined this run — unchanged since then)
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
- last_triaged: 2026-08-31 (not re-examined this run — unchanged since then)
- repro: confirmed (`src/service/purview.ts:727-736` swallows every bridge failure — read, not executed)
- files_expected: src/service/purview.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Product-intent decision (what gets recorded, whether delivery failure changes escalation behaviour) — Charter §4 `NEVER_AUTOMATE` names product intent directly. #8's test 15 was written to be inverted when this lands.

## FQ-32: four run records carry timestamps an hour off, minted from local time and labelled Z
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/32
- last_triaged: 2026-09-01 (re-confirmed 2026-09-16, no change)
- repro: confirmed (each of the four records is anchored against a git or GitHub timestamp in the issue body)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md, docs/factory/runs/2026-08-30T235500Z-implement-8.md, docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md, docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever `.claude/skills/**` change an approved spec adds for the minting rule
- load_bearing: true
- gate_level: deep
- done_when: a spec exists (or an explicit scope decision) separating the docs-only correction from the skill-minting-rule change, approved through factory-spec's human gates
- confidence: medium
- notes: Splits into an `AUTOMATABLE` docs-only half (appending dated corrections to four immutable run records) and a `NEEDS_SPEC` half (the minting-rule fix lives in `.claude/skills/**`, Charter §2 `LOAD_BEARING`). Filed as one issue; a spec or a human should decide whether to split it.

## FQ-33: a PR body's prose can silently close a queue item — two have already gone
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-01 (re-confirmed 2026-09-16, no change)
- repro: confirmed (#28 closed by a merged PR body's closing-keyword sentence on 2026-08-31; #26 closed the same way, mechanism unconfirmed)
- files_expected: docs/factory/specs/FQ-33/** (and whatever `.claude/skills/**` change an approved spec adds)
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding where the PR-body closing-keyword prohibition and its mechanical pre-`gh pr create` check live, and whether an implement run should ever be allowed to write a closing keyword against a queue issue at all
- confidence: high
- notes: Fix touches `.claude/skills/factory-implement/**` at minimum, Charter §2 `LOAD_BEARING`. Worth prioritizing — the review queue is empty, so nothing competes for the human-attention budget this would spend.

## FQ-40: `workitem://{id}/tree` is unreadable unless both `depth` and `attention_only` are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-01 (filed by factory-spec from the FQ-9 implement run; re-confirmed 2026-09-16, no change)
- repro: confirmed (measured over the real transport: bare, `?depth=1` and `?attention_only=true` all return `Resource not found`; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: One template cannot express "either, both, or neither" in RFC 6570 form-style expansion, so this is a shape decision, not a bug fix. The tool surface (`work_query`) treats both arguments as genuinely optional, so the two paths to the same query disagree. Slice 4a's tests document the edge; they do not fix it.

## FQ-41: the claim protocol locks the branch, not the working tree
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-01 (filed by factory-spec from the FQ-9 implement run; re-confirmed 2026-09-16, no change)
- repro: confirmed (observed 2026-08-31: creating `claude/fq-9` moved `HEAD` out from under a live run on #28 in the same checkout)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/**
- load_bearing: true
- gate_level: deep
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Both runs won their claims correctly; the remote ref is a lock on issue ownership and it worked. The unprotected resource is the local checkout. Failure mode is silent, cross-contaminating and invisible to the gates. An agent may not rewrite its own claim protocol unattended in any case.

---

## Blocked — the gates.sh (FQ-23) chain

All seven items below need an attended human session: each edits `.claude/scripts/gates.sh`
(`Edit`-denied in `.claude/settings.json`) or another Charter §2 `LOAD_BEARING` file, and
Contract rule 2 forbids an unattended run from making that edit at all. `factory-spec` already
carried this through all four gates on 2026-08-31 — nothing here is an open design question.

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically, not just in prose (parent)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-01 (re-confirmed 2026-09-16, no change)
- repro: not-attempted (tracking issue; the design gap itself is described, not reproduced, in the issue body)
- files_expected: (none — tracking issue; each slice carries its own)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged; #51 is the deliberately droppable §7 line-ceiling slice and its non-merge does not block closing this item
- confidence: high
- notes: The spec decision this item originally asked for has already been made and approved; it is now the FQ-3-style parent tracking issue for the #46–#51 chain.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-02 (re-confirmed 2026-09-16, no change)
- repro: not-attempted (new test coverage against a not-yet-written mechanism)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts, tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: an attended human session claims this issue and approves the `.claude/scripts/gates.sh` edit in-session; `gates.sh full` then prints `base_source=`, `protected_globs=` and `protected=`; `gates.sh fast` prints `base_source=not-measured protected=not-measured`; a bash older than 3.2 prints `misconfigured=unsupported-bash` and exits 2; the three tests pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: An unattended implement run claimed this on 2026-09-01, correctly stopped at the charter check per Contract rule 2, and self-corrected its own label from `ready-to-implement` to `ready-to-spec`. Triage moved it to `wait-to-implement` instead — the blocker is a named dependency (an attended session), not an undecided scope question, which is what `wait-to-implement` means and `ready-to-spec` does not. Every future scheduled triage or implement run should leave this whole chain unattended-ineligible rather than re-deriving the same stop.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires: charter parse and real diff
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-08-31 (re-confirmed 2026-09-16, no change)
- repro: not-attempted (new test coverage against a not-yet-written mechanism)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts, tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: modifying a pre-existing protected file reports its path in `protected=` while `status` stays GREEN; adding a new file under the same glob reports `none`; `protected_globs` matches the charter's own count; tests 1, 2, 3, 7 and 8 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #46 (slice 0 — `resolve_base` and the field plumbing this slice fills in). Pre-agreed split seam if this measures over the 400-line ceiling: land tests 1, 2, 3, 7 here, defer test 8 and the glob-echo to a 1b slice — do not trim a test to fit.

## FQ-48: gates.sh slice 2 — diff shape: deletion, rename, committed state, empty-pathspec guard
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-08-31 (re-confirmed 2026-09-16, no change)
- repro: not-attempted (new test coverage against a not-yet-written mechanism)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: deleting or renaming-away a pre-existing protected file reports its path; a committed modification reports identically to an uncommitted one; a zero-glob charter never invokes `git diff` with an empty pathspec; tests 4, 5, 6 and 19 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #47 (slice 1's `measure_protected`, which this slice refines). Test 19 is the one to review hardest — an unguarded zero-glob parse would report every changed file as protected, which gets waived by reflex within a day.

## FQ-49: gates.sh slice 3 — charter fidelity: §3 flag, anchored parse, fail-closed degradation
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-08-31 (re-confirmed 2026-09-16, no change)
- repro: not-attempted (new test coverage against a not-yet-written mechanism)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `TESTS_ARE_LOAD_BEARING: false` reports `not-enforced`; a missing/renamed `TESTS_PROTECTED` block reports `undetermined`, never `none`; a fourth charter glob is honoured with no second edit; a deleted charter still produces a `FACTORY_GATES:` line; tests 9, 10, 11, 12 and 18 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #47 (slice 1's `parse_charter_section3`, which this slice completes). Test 9 is the slice's reason to exist — proof the charter is the single source of the rule.

## FQ-50: gates.sh slice 4 — base-ref override, and the 'full HEAD' bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-08-31 (re-confirmed 2026-09-16, no change)
- repro: confirmed (`./.claude/scripts/gates.sh full HEAD` measured during the spec: real short SHA, empty diff, indistinguishable from a legitimate run)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: a supplied base ref is honoured only when it resolves, is an ancestor of HEAD, and is not HEAD itself on a clean tree; any failure reports `base_source=none` with no fallback to auto-detection; `gates.sh full HEAD` on a clean tree reports `undetermined`, not `none`; tests 13, 14, 15 and 16 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #46 (slice 0's `resolve_base`, whose `$2` branch this slice adds). Closes a verified bypass, not a hypothesised one.

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-08-31 (re-confirmed 2026-09-16, no change)
- repro: confirmed (`git diff --numstat` cannot see an untracked file; verified an add-only 5-line change measures `code_lines=0` without the untracked-count fix)
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md, tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `gates.sh full` reports `code_lines` (tracked + untracked, docs excluded) and `code_lines_committed` (Charter §7's own invocation); `factory-verify/SKILL.md` states `code_lines` is excluded from its exact-match mismatch check; tests 20–24 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: medium
- notes: blocked_on #46. Deliberately droppable — gate 1 approved the §7 ceiling as independently reversible from the §3 fix in #46–#50. Touches two `LOAD_BEARING` files, so this stop needs a human twice: once for `gates.sh`, once for `SKILL.md`.

---

## Do not merge `archive/fq-5-slice0-original`

It is green and most of its lines are reused across the now-merged #5 and #18, but it *is*
the 515-line diff the Charter §7 ceiling stopped. It is a cherry-pick source only. Delete the
archive once its last consumer (already merged) is confirmed by a human read.
