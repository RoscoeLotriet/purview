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

_Snapshot rebuilt by `factory-triage` on 2026-09-12, superseding the `factory-spec` snapshot
of 2026-08-31. Live labels are the source of truth._

Since the prior snapshot: FQ-3 (the integration-suite parent, #3) closed complete on
2026-08-31 — #38 and #39 (its last two slices) merged and the tracking issue itself was
closed by a human, not by this routine. A `factory-spec` run then took #23 through all four
gates (approved 2026-08-31) and filed six slices, #46–#51, as the FQ-23 chain. #46 was
briefly `ready-to-implement`; an unattended `factory-implement` run claimed it, correctly
stopped at the Contract rule 2 charter check (`.claude/scripts/gates.sh` cannot be edited
without a human in session), and the label was re-derived to `wait-to-implement` to match its
siblings. Separately, four issues surfaced by the FQ-9 implement/spec work (#32, #33, #40,
#41) were classified `ready-to-spec` against the charter. See **Charter compliance gap**
below: none of that relabeling between 2026-09-01 and 2026-09-02 has a run record, though the
labels and handoff comments it produced are sound and this run independently re-confirmed
every one of them.

This run re-examined every issue updated since the last triage run record
(`docs/factory/runs/2026-08-31T060646Z-triage-run.md`, `finished_at: 2026-08-31T06:08:15Z`):
11 of 13 open issues qualified. #11 and #12 were last touched 2026-08-29 and were not
re-examined; their entries below are carried forward unchanged. 0 issues were untriaged (no
open issue lacks a `factory:` state label). 0 issues were skipped for the 20-item cap (13
open, well under it).

Counts: ready-to-implement=0, ready-to-spec=6 (#11, #12, #32, #33, #40, #41),
wait-to-implement=7 (#23, #46, #47, #48, #49, #50, #51), needs-info=0, awaiting-review=0.

**The review queue is empty**, so Charter §7's cap of 3 items awaiting human review is nowhere
close to binding. The constraint on this queue right now is not review budget — it is that
every ready-to-implement-shaped slice (#46–#51) needs a human physically in an interactive
session to approve a `.claude/scripts/gates.sh` edit, which no scheduled run can supply.

## Blocked on an attended session (FQ-23: mechanical enforcement of Charter §3/§7)

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically, not just in prose
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-12
- repro: not-attempted (tracking issue for the slice chain, no code of its own)
- files_expected: (none — each slice carries its own files_expected)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged (#51 is the deliberately droppable §7 line-ceiling slice and its non-merge does not block closing this item)
- confidence: high
- notes: Re-confirmed unchanged. Spec approved through all four gates 2026-08-31; nothing here is undecided, so `ready-to-spec` no longer fits — the blocker is an attended human session to approve each `.claude/scripts/gates.sh` edit (Contract rule 2), not more thinking.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-12
- repro: not-attempted (new test coverage against an approved spec, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts, tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `gates.sh full` prints a FACTORY_GATES line carrying `base_source=`, `protected_globs=` and `protected=`; `gates.sh fast` prints `base_source=not-measured protected=not-measured`; a bash older than 3.2 prints `misconfigured=unsupported-bash` and exits 2; the three tests pass, including one that runs the real `./.claude/scripts/gates.sh fast` in this repository and parses its line; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: An unattended `factory-implement` run claimed this on 2026-09-01, correctly stopped at Contract rule 2 (`.claude/**` is `Edit`-denied for an unattended session), and self-corrected off `ready-to-implement`. This run independently confirms `wait-to-implement` — the named blocker is a human choosing to sit in an interactive session, which is a decision not yet made, not a spec question.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires: charter parse and real diff
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-09-12
- repro: not-attempted (new test coverage against an approved spec)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts, tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: modifying a pre-existing file matching a Charter §3 `TESTS_PROTECTED` glob reports its path in `protected=` while `status` stays GREEN; adding a new file under the same glob reports `protected=none`; `protected_globs` equals the number of globs parsed from `CHARTER.md`; tests 1, 2, 3, 7 and 8 pass (pre-agreed seam: if over the 400-line ceiling, land 1/2/3/7 here and take test 8 as 1b — do not trim a test to fit); no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #46 landing first (`resolve_base`, which this slice's diff logic depends on) and on the same attended-session requirement.

## FQ-48: gates.sh slice 2 — diff shape: deletion, rename, committed state, empty-pathspec guard
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-09-12
- repro: not-attempted (new test coverage against an approved spec)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: deleting a pre-existing protected file reports its path; renaming one away reports it; a committed modification reports identically to an uncommitted one; a zero-glob parse never invokes `git diff` with an empty pathspec; tests 4, 5, 6 and 19 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #47 (`measure_protected`, which this slice refines) and the attended-session requirement.

## FQ-49: gates.sh slice 3 — charter fidelity: §3 flag, anchored parse, fail-closed degradation
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-09-12
- repro: not-attempted (new test coverage against an approved spec)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `TESTS_ARE_LOAD_BEARING: false` reports `not-enforced`; an absent or renamed `TESTS_PROTECTED` block reports `undetermined`, never `none`; a fourth charter glob reports `protected_globs=4` and catches a file matching only it; a truncated block is visible in `protected_globs`; a deleted charter still prints a FACTORY_GATES line; tests 9, 10, 11, 12 and 18 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #47 (`parse_charter_section3`, which this slice completes) and the attended-session requirement. Two limits (truncation visible-not-detected; a one-character glob typo is a real hole) are deliberately pinned, not fixed, here.

## FQ-50: gates.sh slice 4 — base-ref override, and the 'full HEAD' bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-09-12
- repro: confirmed (verified during the FQ-23 spec: `./.claude/scripts/gates.sh full HEAD` prints a real short SHA with an empty diff — indistinguishable from a legitimate run)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: a supplied base ref is honoured only when it resolves, is an ancestor of HEAD, and is not HEAD itself on a clean tree (`base_source=arg`); any failure reports `base_source=none` without falling back to auto-detection; `gates.sh full HEAD` on a clean tree reports `undetermined`, not `none`; tests 13, 14, 15 and 16 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #46 (`resolve_base`, whose `$2` branch this slice adds) and the attended-session requirement. Closes a verified bypass in the existing `Bash(./.claude/scripts/gates.sh:*)` allowlist rule.

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-09-12
- repro: not-attempted (new test coverage against an approved spec)
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md, tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `gates.sh full` reports `code_lines=<n>` (tracked + untracked non-doc additions) and `code_lines_committed=<n>` (Charter §7's own invocation); both exclude `docs/**` and `**/*.md`; `not-measured` at `fast`, `undetermined` when the base is undetermined; `factory-verify/SKILL.md` states `code_lines` is excluded from its exact-match mismatch check; tests 20–24 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: medium
- notes: Deliberately droppable — gate 1 approved the §7 ceiling as independently reversible from the §3 fix. Touches **two** load-bearing files, so needs the attended-session approval twice. Blocked on #46 for the field plumbing it writes into.

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
- notes: Not re-examined this run (unchanged since 2026-08-29). `.github/workflows/**` is Charter §2 `LOAD_BEARING`, which Charter §4 `NEEDS_SPEC` names directly.

## FQ-12: record Slack delivery outcome so a dropped escalation is observable
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/12
- last_triaged: 2026-08-31
- repro: confirmed (`src/service/purview.ts:727-738` swallows every bridge failure — read, not executed)
- files_expected: src/service/purview.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Not re-examined this run (unchanged since 2026-08-29). Product-intent decision (what gets recorded, whether delivery failure changes escalation behaviour) — Charter §4 `NEVER_AUTOMATE` names product intent directly. FQ-3's test 15 was written to be inverted when this lands, and has since merged as part of #37.

## FQ-32: four run records carry timestamps an hour off, minted from local time and labelled Z
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/32
- last_triaged: 2026-09-12
- repro: confirmed (each of the four named records checked against a git/GitHub anchor in the issue body; the direction of the error is not consistent, so no single script fix applies)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md, docs/factory/runs/2026-08-30T235500Z-implement-8.md, docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md, docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever `.claude/skills/**` change the approved spec adds for the minting rule
- load_bearing: true
- gate_level: deep
- done_when: a spec exists (or an explicit scope decision) separating the docs-only correction from the skill-minting-rule change, approved through factory-spec's human gates
- confidence: medium
- notes: Re-confirmed unchanged. Splits into an `AUTOMATABLE` docs-only half (appending a dated correction to four immutable records) and a `.claude/skills/**` `LOAD_BEARING` half (the minting-rule fix) — filed as one issue, so the split is a decision for a human or a spec run, not triage's to make unilaterally.

## FQ-33: a PR body's prose can silently close a queue item — two have already gone
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-12
- repro: confirmed (#28 closed by PR #29's body containing "close #28"; #26 closed the same day with the same symptom, mechanism unconfirmed)
- files_expected: docs/factory/specs/FQ-33/** (and whatever `.claude/skills/**` change the approved spec adds)
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding where the PR-body closing-keyword prohibition and its mechanical pre-`gh pr create` check live, and whether an implement run should ever be allowed to write a closing keyword against a queue issue at all — approved through factory-spec's human gates
- confidence: high
- notes: Re-confirmed unchanged. Fix touches skill files that compose PR bodies (at minimum `factory-implement`), Charter §2 `LOAD_BEARING`. Worth prioritizing: the review queue is empty, so nothing competes for the human-attention budget this would spend, and the failure mode (a silently vanished queue item, invisible to every counting mechanism the factory has) has already happened twice.

## FQ-40: workitem://{id}/tree is unreadable unless both depth and attention_only are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-12
- repro: confirmed (measured over the real transport: bare, `?depth=1` and `?attention_only=true` all return `Resource not found`; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists deciding whether `depth` and `attention_only` should be individually optional, whether an unmatched-but-plausible URI should return a more specific error, and whether the resource description should just state the requirement if the shape is kept — approved through factory-spec's human gates
- confidence: high
- notes: Re-confirmed unchanged. Changes a public MCP read surface — Charter §4 `NEEDS_SPEC` names this directly. Not on the Charter §2 `LOAD_BEARING` glob list, so `full` once specced, not `deep`.

## FQ-41: the claim protocol locks the branch, not the working tree
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-12
- repro: confirmed (observed 2026-08-31: creating `claude/fq-9` moved `HEAD` out from under a live run on #28 in the same checkout)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/** (and whatever the approved spec adds)
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding whether an implement run must isolate its checkout, how a run detects it is not alone before switching branches, what a run does on detected contention, and whether the verifier's clean-checkout requirement becomes a first-class precondition of the claim protocol — approved through factory-spec's human gates
- confidence: high
- notes: Re-confirmed unchanged. Both runs involved won their remote-ref claims correctly; the unprotected resource is the shared local checkout, which the protocol never mentions. Not urgent (nothing broken on `main`), but the collision was silent and cross-contaminating, and was caught only by chance.

---

## Charter compliance gap, not an issue-level finding

Five of this run's eleven re-examined issues (#23, #32, #33, #40, #41) already carried
correct, current `factory-handoff:v1` comments and labels timestamped 2026-09-01T06:18–06:19Z
and 2026-09-02T06:05Z — evidently a triage-shaped pass ran in that window. **No
`docs/factory/runs/` record exists for it**, and `docs/factory/QUEUE.md` on `main` was not
updated to reflect it (it still read as the 2026-08-31 `factory-spec` snapshot until this
run). `CONTRACT.md`'s "Durable evidence" section says every run writes one new file under
`docs/factory/runs/`; whatever produced those comments did not. This run independently
re-derived every one of those five dispositions against the charter rather than trusting the
unrecorded pass, and reached the same conclusions in all five cases — so nothing here is
currently mislabeled. But the gap in evidence is real: without a run record, there is no
`started_at`/`finished_at`, no stated gate status, and no way to compute this window into the
flow metrics `runs/README.md` says the records exist to support. Worth a human decision on
what produced that pass and whether it should have written a record.

---

## Do not merge `archive/fq-5-slice0-original`

Carried forward from the prior snapshot; not independently re-verified this run since neither
the archive branch nor its status changed. It is green and most of its lines are reused
across the now-merged #5 and #18, but it *is* the 515-line diff the Charter §7 ceiling
stopped. It is a cherry-pick source only. Delete the archive once its last consumer (already
merged) is confirmed by a human read.
