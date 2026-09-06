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

_Snapshot rebuilt by `factory-triage` on 2026-09-06, superseding the `factory-spec` snapshot
of 2026-08-31 (gate 4 revision 3). Live labels are the source of truth._

Since the prior snapshot, FQ-3 finished in full: #38 and #39 (slices 4a/4b) merged as PRs #43
and #44, and #45 closed out the tracking issue and cleared its stale labels. #3, #8, #9, #10,
#26, #28, #38 and #39 are all gone from the open-issue list because of this — none of them
carry a live queue-state label any more. `docs/factory/CONTRACT.md`'s own rule applies here:
an unmerged snapshot (the 2026-08-31 one, in this case already merged) must never be trusted
over live labels, so this run re-derived everything from GitHub rather than diffing against
it.

FQ-23 (gates.sh: enforce Charter §3 mechanically) went through `factory-spec` in full on
2026-08-31 and is now six tracked issues: the parent (#23) plus five ordered slices (#46-#50)
and one droppable slice (#51). Three new items were filed independently and confirmed
`ready-to-spec` on re-derivation: #32 (run-record timestamp drift), #33 (PR-body closing
keywords silently closing issues), #40 and #41 (both filed from the FQ-9 implement run,
carried forward unchanged).

**13 open issues total, all already carrying a `factory:` state label — 0 untriaged. 11 of
13 were updated since the prior triage run's `finished_at` (2026-08-31T06:08:15Z) and were
re-examined; #11 and #12 were not (last changed 2026-08-29) and are carried forward
unchanged. 0 issues skipped — the 20-item cap was not reached.**

Counts: ready-to-implement=0, ready-to-spec=6 (#11, #12, #32, #33, #40, #41),
wait-to-implement=6 (#23, #46, #47, #48, #49, #50, #51 — seven issues, six of which
(`#23` plus `#46`-`#50`) are the mandatory FQ-23 chain and one (`#51`) is its declared
droppable slice), needs-info=0, awaiting-review=0.

**No label changed this run.** Every open issue's disposition, on independent re-derivation
against `CHARTER.md`, matched its existing label and handoff comment. See the run record for
the reasoning behind the one disposition worth double-checking (#46's `wait-to-implement`,
which is not the literal "minimum ready-to-spec" Charter §2 names for a load-bearing path).

**The review queue is empty**, so the FQ-23 chain may resume as soon as a human is willing to
sit in an attended session — every slice in it needs one, per Contract rule 2, regardless of
label.

## Blocked on an attended human session

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically (parent)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-06
- repro: not-attempted (tracking issue for an approved spec, no code of its own)
- files_expected: (none — tracking issue; each slice carries its own files_expected)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged (the mandatory slices that close the §3 enforcement hole); #51 is gate 1's deliberately droppable §7 line-ceiling slice and its non-merge does not block closing this item
- confidence: high
- notes: Unchanged this run. Spec approved through all four gates on 2026-08-31; this issue is now the parent tracking issue for the six-slice chain below, each of which touches Charter §2 `LOAD_BEARING` `.claude/scripts/gates.sh`.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-06
- repro: not-attempted (spec-approved slice, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts, tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: an attended human session claims this issue and approves the `.claude/scripts/gates.sh` edit in-session (Contract rule 2); once that happens, `./.claude/scripts/gates.sh full` prints a FACTORY_GATES line carrying `base_source=`, `protected_globs=` and `protected=`; `gates.sh fast` prints `base_source=not-measured protected=not-measured`; a bash older than 3.2 prints `misconfigured=unsupported-bash` and exits 2; the three tests pass, including one that runs the real `./.claude/scripts/gates.sh fast` in this repository and parses its line; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Re-derived, not carried forward on faith. An unattended implement run claimed this on 2026-09-01, correctly refused to edit `.claude/scripts/gates.sh` unattended (Contract rule 2, and the path is `Edit`-denied in `settings.json` regardless), and self-corrected its own label from `ready-to-implement` to `ready-to-spec`. That label undersells the state: the spec is already fully approved, so nothing about scope is undecided — the sole remaining blocker is a human choosing to sit in session. `wait-to-implement`'s definition ("understood and valid, but blocked... on a decision not yet made") fits better than re-running a spec that already happened, and this run concurs with that correction rather than reopening the question.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires: charter parse and real diff
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-09-06
- repro: not-attempted (spec-approved slice, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts, tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: modifying a pre-existing file matching a Charter §3 TESTS_PROTECTED glob makes `gates.sh full` report that file's path in `protected=` while `status` stays GREEN; adding a new file under the same glob reports `protected=none`; `protected_globs` equals the number of globs actually parsed from `docs/factory/CHARTER.md`; tests 1, 2, 3, 7 and 8 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Unchanged this run. Blocked on #46 (slice 0 supplies `resolve_base` and the field plumbing this slice fills in). Pre-agreed split seam if the ~300-line estimate overruns Charter §7: land tests 1, 2, 3, 7 here; take test 8 and the glob-echo as slice 1b. Do not trim a test to fit.

## FQ-48: gates.sh slice 2 — diff shape: deletion, rename, committed state, empty-pathspec guard
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-09-06
- repro: not-attempted (spec-approved slice, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: deleting a pre-existing protected file reports its path; renaming one away reports it; a modification that is already committed reports identically to an uncommitted one; a charter yielding zero globs never invokes `git diff` with an empty pathspec; tests 4, 5, 6 and 19 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Unchanged this run. Blocked on #47 (`measure_protected`, which this slice refines). Test 19 (the empty-pathspec guard) is the one to review hardest — a zero-glob parse without the short-circuit would report every changed file as a protected modification.

## FQ-49: gates.sh slice 3 — charter fidelity: §3 flag, anchored parse, fail-closed degradation
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-09-06
- repro: not-attempted (spec-approved slice, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `TESTS_ARE_LOAD_BEARING: false` reports `protected=not-enforced`; a charter whose TESTS_PROTECTED block is absent or renamed reports `undetermined` and never `none`; a charter given a fourth glob reports `protected_globs=4` and reports a file matching only the new glob; a truncated block is visible in `protected_globs`; a deleted charter still produces a FACTORY_GATES line; tests 9, 10, 11, 12 and 18 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Unchanged this run. Blocked on #47 (`parse_charter_section3`, which this slice completes). Test 9 (a fourth charter glob is honoured with no second edit) is this slice's reason to exist; two known limits (a silently truncating parse, a one-character glob typo) are pinned, not fixed, by design.

## FQ-50: gates.sh slice 4 — base-ref override, and the 'full HEAD' bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-09-06
- repro: confirmed (verified during the spec: `./.claude/scripts/gates.sh full HEAD` on a clean tree prints a real short SHA with `protected=none code_lines=0` — indistinguishable from a legitimate run)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: a supplied base ref is used only when it resolves, is an ancestor of HEAD, and is not HEAD itself on a clean tree, reporting `base_source=arg`; any failure of those three reports `base_source=none` and `protected=undetermined` without falling back to auto-detection; `gates.sh full HEAD` on a clean tree reports `undetermined` and not `none`; tests 13, 14, 15 and 16 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Unchanged this run. Blocked on #46 (`resolve_base`, whose `$2` branch this slice adds). Closes a verified bypass permitted by the existing `Bash(./.claude/scripts/gates.sh:*)` prefix rule in `settings.json`.

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-09-06
- repro: not-attempted (spec-approved slice, not a bug report)
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md, tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `gates.sh full` reports `code_lines=<n>` counting tracked changes and untracked non-documentation additions, plus `code_lines_committed=<n>` reproducing Charter §7's own invocation; `docs/**` and `**/*.md` are excluded from both; `code_lines` is `not-measured` at `fast` and `undetermined` when the base is undetermined; `.claude/skills/factory-verify/SKILL.md` states that `code_lines` is excluded from its "a mismatch is the finding" comparison; tests 20, 21, 22, 23 and 24 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: medium
- notes: Unchanged this run. Blocked on #46. Deliberately droppable — gate 1 approved the §7 ceiling as independently reversible from slices 0-4. Touches two load-bearing files (`gates.sh` and `factory-verify/SKILL.md`), so this run needs a human twice.

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
- notes: Not re-examined this run — unchanged since 2026-08-29, before the prior triage run's cutoff. `.github/workflows/**` is Charter §2 `LOAD_BEARING`, which Charter §4 `NEEDS_SPEC` names directly.

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
- notes: Not re-examined this run — unchanged since 2026-08-29, before the prior triage run's cutoff. Product-intent decision (what gets recorded, whether delivery failure changes escalation behaviour) — Charter §4 `NEVER_AUTOMATE` names product intent directly. FQ-3's test 15 was written to be inverted when this lands and has since merged with #8.

## FQ-32: docs(factory) — four run records carry timestamps an hour off, minted from local time and labelled Z
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/32
- last_triaged: 2026-09-06
- repro: confirmed (each of the four named run records anchored against git/GitHub timestamps in the issue body; e.g. `2026-08-30T232000Z-implement-7.md` claims the run was still going an hour after its own PR #27 merged)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md, docs/factory/runs/2026-08-30T235500Z-implement-8.md, docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md, docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever `.claude/skills/**` change the approved spec adds for the minting rule
- load_bearing: true
- gate_level: deep
- confidence: medium
- notes: Unchanged this run. Splits into an automatable half (appending a `## Timestamp correction` section to four immutable, already-merged records — Charter §4 `AUTOMATABLE`, "Documentation and comment corrections") and a load-bearing half (the `run_id`/front-matter minting-rule fix in `.claude/skills/**`). Filed as one issue; triage does not narrow scope on its own, so a spec (or a human) decides whether to split it. `confidence: medium` is on the split, not the disposition.

## FQ-33: a PR body's prose can silently close a queue item — two have already gone
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-06
- repro: confirmed (GitHub's closing-keyword scan closed #28 via a sentence in PR #29's "Not done" section offering the reviewer an option, not a stated intent to close)
- files_expected: docs/factory/specs/FQ-33/** (and whatever `.claude/skills/**` change the approved spec adds)
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: Unchanged this run. Touches skill files that compose PR bodies (at minimum `.claude/skills/factory-implement/**`) — Charter §2 `LOAD_BEARING`, Charter §4 `NEEDS_SPEC`. Worth prioritizing: two queue items (#28 confirmed, #26 suspected) have already been silently closed this way, and the review queue is currently empty.

## FQ-40: mcp — workitem://{id}/tree is unreadable unless both depth and attention_only are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-06
- repro: confirmed (measured over the real transport: bare, `?depth=1` and `?attention_only=true` all return `Resource not found`; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- confidence: high
- notes: Unchanged this run. Changes a public MCP read surface — Charter §4 `NEEDS_SPEC` names this directly ("Anything changing a public API or exported type signature"). One RFC 6570 template cannot express "either, both, or neither" in form-style expansion, so this is a shape decision, not a bug fix.

## FQ-41: the claim protocol locks the branch, not the working tree
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-06
- repro: confirmed (observed 2026-08-31: creating `claude/fq-9` moved `HEAD` out from under a live run on #28 in the same checkout)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/** (and whatever the approved spec adds)
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: Unchanged this run. Touches the claim protocol itself — Charter §2 `LOAD_BEARING`, and Charter §2's own principle (an agent must not rewrite its own constraints) applies to the claim protocol as much as to `gates.sh`. Not urgent — nothing is currently broken on `main` — but the collision was silent and caught only by chance.

---

## Do not merge `archive/fq-5-slice0-original`

It is green and most of its lines are reused across the now-merged #5 and #18, but it *is*
the 515-line diff the Charter §7 ceiling stopped. It is a cherry-pick source only. Delete the
archive once its last consumer (already merged) is confirmed by a human read.
