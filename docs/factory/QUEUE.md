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

_Snapshot rebuilt by `factory-triage` on 2026-09-15, superseding the version on `main`
(written by `factory-spec` on 2026-08-31, gate 4 revision 3). That version predates the FQ-3
epic closing complete and the entire FQ-23 `gates.sh` slice chain, neither of which it
reflects. Live labels are the source of truth; this snapshot was rebuilt from them, not from
the stale file or from any of the 15 open, unmerged prior `factory-triage` PRs (#52–#65)._

**13 open issues, 0 skipped (cap 20), 0 untriaged.** Every open issue already carries a
`factory:` state label. 11 of 13 qualified for re-examination — updated since the last
*recorded* triage run's `finished_at` (`2026-08-31T06:08:15Z`,
`docs/factory/runs/2026-08-31T060646Z-triage-run.md`): the FQ-23 `gates.sh` chain (#23,
#46–#51) and #32, #33, #40, #41. #11 and #12 were not re-examined — both unchanged since
2026-08-29, before that cutoff.

**Every one of the 11 re-examined issues was independently re-derived to the disposition it
already carries on GitHub. No label changed. No new `factory-handoff:v1` comment was
posted.** This is consistent with every scheduled triage run since 2026-09-01 (PRs #52
through #65) — see "Charter gap — no mechanism for a triage routine's own unmerged backlog"
below, which is now the most important thing on this page.

Counts: **ready-to-implement=0**, **ready-to-spec=6** (#11, #12, #32, #33, #40, #41),
**wait-to-implement=7** (#23, #46, #47, #48, #49, #50, #51), **needs-info=0**,
**awaiting-review=0**.

## What's actually blocking the queue

- **The FQ-23 `gates.sh` chain (7 issues)** is fully specced and human-approved
  (2026-08-31), but every slice's entire edit surface is `.claude/scripts/gates.sh`, which
  is `Edit`-denied for unattended runs (Charter §2 `LOAD_BEARING`, Contract rule 2). It needs
  a human physically present in session to approve each edit. Verified, not assumed: an
  unattended implement run claimed #46 on 2026-09-01, correctly refused to edit the file, and
  self-corrected its own routed label — see #46's comment thread.
- **The 6 `ready-to-spec` items** need a human running `factory-spec`. #33 (a PR body's
  prose can silently close a queue item) is worth prioritizing first — it has already cost
  two queue items (#28, possibly #26) and the review queue is empty, so nothing competes for
  the attention budget.
- **16 open, unmerged `factory-triage` PRs (#52–#66)** are the third thing blocking the
  queue, in a sense the queue itself cannot see: each is independently correct and none is
  stale, but nothing has consolidated them. See the charter gap below.

## Ready-to-spec

## FQ-11: run the factory gates automatically on every push
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/11
- last_triaged: 2026-08-31 (not re-examined this run — unchanged since 2026-08-29, before the
  last-recorded-run cutoff)
- repro: not-attempted (no CI exists yet — nothing to reproduce)
- files_expected: .github/workflows/**
- load_bearing: true
- gate_level: deep
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Unchanged. `.github/workflows/**` is Charter §2 `LOAD_BEARING`, which Charter §4
  `NEEDS_SPEC` names directly.

## FQ-12: record Slack delivery outcome so a dropped escalation is observable
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/12
- last_triaged: 2026-08-31 (not re-examined this run — unchanged since 2026-08-29)
- repro: confirmed (`src/service/purview.ts:727-736` swallows every bridge failure — read,
  not executed)
- files_expected: src/service/purview.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Unchanged. Product-intent decision (what gets recorded, whether delivery failure
  changes escalation behaviour) — Charter §4 `NEVER_AUTOMATE` names product intent directly.

## FQ-32: four run records carry timestamps an hour off, minted from local time and labelled Z
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/32
- last_triaged: 2026-09-15 (re-derived independently; unchanged since first triaged
  2026-09-01)
- repro: confirmed (each of the four records checked against its own PR/commit timestamp
  anchor in the issue body)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md,
  docs/factory/runs/2026-08-30T235500Z-implement-8.md,
  docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md,
  docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever `.claude/skills/**`
  change the approved spec adds for the minting rule
- load_bearing: true
- gate_level: deep
- confidence: medium
- notes: Splits into a docs-only correction (matches `AUTOMATABLE`) and a `.claude/skills/**`
  minting-rule change (Charter §2 `LOAD_BEARING`, forcing the whole item to `ready-to-spec`).
  A spec should decide whether to split into a `ready-to-implement` docs slice plus a
  `ready-to-spec` skill-rule slice, or run it as filed.

## FQ-33: a PR body's prose can silently close a queue item — two have already gone
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-15 (re-derived independently; unchanged since first triaged
  2026-09-01)
- repro: confirmed (PR #29's body closed #28 on merge via an incidental closing-keyword
  match; #26 closed the same way but the mechanism there is unconfirmed)
- files_expected: docs/factory/specs/FQ-33/** (and whatever `.claude/skills/**` change the
  approved spec adds)
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: Touches skill files that compose PR bodies (`.claude/skills/factory-implement/**`
  at minimum), Charter §2 `LOAD_BEARING`. Worth prioritizing when a human next runs
  `factory-spec` — two queue items already lost to this defect, review queue is empty, and no
  other item is competing for the attention budget.

## FQ-40: workitem://{id}/tree is unreadable unless both depth and attention_only are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-15 (re-derived independently; unchanged since first triaged
  2026-09-01)
- repro: confirmed (measured over the real transport: bare, `?depth=1` and
  `?attention_only=true` all return `Resource not found`; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- confidence: high
- notes: Changes a public MCP read surface (a resource template's URI-matching behaviour) —
  Charter §4 `NEEDS_SPEC` names this directly. Not on the §2 `LOAD_BEARING` glob list, so
  `full` gates once specced, not `deep`.

## FQ-41: the claim protocol locks the branch, not the working tree
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-15 (re-derived independently; unchanged since first triaged
  2026-09-01)
- repro: confirmed (observed 2026-08-31: creating `claude/fq-9` moved `HEAD` out from under a
  live run on #28 in the same checkout)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/**
- load_bearing: true
- gate_level: deep
- confidence: high
- notes: Both runs won their remote-ref claims correctly; the unprotected resource is the
  local checkout. An agent may not rewrite its own claim protocol unattended in any case.

---

## Wait-to-implement — the FQ-23 gates.sh chain

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically, not just in prose (parent)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-15 (re-derived independently; unchanged since re-derivation to this
  parent shape on 2026-09-01)
- repro: not-attempted (tracking issue, no code of its own — the underlying report gap was
  confirmed by reading `gates.sh`, unchanged this run)
- files_expected: (none — this issue is now the slice-chain tracking issue; each slice
  carries its own files_expected)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged (the mandatory slices that close the §3
  enforcement hole); #51 is gate 1's deliberately droppable §7 line-ceiling slice and its
  non-merge does not block closing this item
- confidence: high
- notes: `factory-spec` took this through all four gates (human-approved 2026-08-31) and
  filed six slice issues (#46–#51). This issue is now the FQ-3-style parent tracking issue
  for the chain, hence `wait-to-implement` rather than `ready-to-spec` — the spec decision
  this item originally asked for has already been made.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-15 (re-derived independently; label re-derivation confirmed as of
  2026-09-02)
- repro: not-attempted (new test coverage plus a load-bearing script change, not a bug
  report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts,
  tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: an attended human session claims this issue and approves the
  `.claude/scripts/gates.sh` edit in-session (Contract rule 2); once that happens,
  `./.claude/scripts/gates.sh full` prints a FACTORY_GATES line carrying `base_source=`,
  `protected_globs=` and `protected=`; `gates.sh fast` prints
  `base_source=not-measured protected=not-measured`; a bash older than 3.2 prints
  `misconfigured=unsupported-bash` and exits 2; the three tests pass, including one that runs
  the real `./.claude/scripts/gates.sh fast` in this repository and parses its line; no
  pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: An unattended implement run claimed this on 2026-09-01, correctly stopped at the
  Contract rule 2 charter check without editing anything, and self-corrected the label —
  first to `ready-to-spec`, then a later triage pass moved it to `wait-to-implement` to match
  its siblings, since the real blocker is an attended session, not undecided scope. The
  original `ready-to-implement` handoff was the triage error this chain exists to prevent
  recurring: no unattended run can complete any FQ-23 slice.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires: charter parse and real diff
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-09-15 (re-derived independently; unchanged since filed 2026-08-31)
- repro: not-attempted (new test coverage plus a load-bearing script change)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts,
  tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: modifying a pre-existing file matching a Charter §3 TESTS_PROTECTED glob makes
  `gates.sh full` report that file's path in `protected=` while `status` stays GREEN; adding
  a new file under the same glob reports `protected=none`; `protected_globs` equals the
  number of globs actually parsed from `docs/factory/CHARTER.md`; tests 1, 2, 3, 7 and 8
  pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #46 (slice 0 — the field plumbing and `resolve_base` this slice fills
  in). Carries a pre-agreed split seam in its own handoff comment if it measures over the
  Charter §7 ceiling: land tests 1, 2, 3, 7 as this slice, take test 8 into 1b.

## FQ-48: gates.sh slice 2 — diff shape: deletion, rename, committed state, empty-pathspec guard
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-09-15 (re-derived independently; unchanged since filed 2026-08-31)
- repro: not-attempted (new test coverage plus a load-bearing script change)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: deleting a pre-existing protected file reports its path; renaming one away
  reports it; a modification that is already committed reports identically to an
  uncommitted one; a charter yielding zero globs never invokes `git diff` with an empty
  pathspec; tests 4, 5, 6 and 19 pass; no pre-existing test file is modified; gates GREEN at
  `deep`
- confidence: high
- notes: Blocked on #47 (slice 1 — `measure_protected`, which this slice refines). Test 19
  (the empty-pathspec guard) is flagged in the issue as the one to review hardest.

## FQ-49: gates.sh slice 3 — charter fidelity: §3 flag, anchored parse, fail-closed degradation
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-09-15 (re-derived independently; unchanged since filed 2026-08-31)
- repro: not-attempted (new test coverage plus a load-bearing script change)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `TESTS_ARE_LOAD_BEARING: false` reports `protected=not-enforced`; a charter
  whose TESTS_PROTECTED block is absent or renamed reports `undetermined` and never `none`;
  a charter given a fourth glob reports `protected_globs=4` and reports a file matching only
  the new glob; a truncated block is visible in `protected_globs`; a deleted charter still
  produces a FACTORY_GATES line; tests 9, 10, 11, 12 and 18 pass; no pre-existing test file
  is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #47 (slice 1 — `parse_charter_section3`, which this slice completes).
  Test 9 (a fourth charter glob is picked up with no second edit) is the slice's reason to
  exist; two known limits (truncating parse, one-character glob typos) are pinned as
  residual, not fixed here.

## FQ-50: gates.sh slice 4 — base-ref override, and the 'full HEAD' bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-09-15 (re-derived independently; unchanged since filed 2026-08-31)
- repro: confirmed (verified against this repository during the spec:
  `./.claude/scripts/gates.sh full HEAD` printed a real short SHA with an empty diff,
  indistinguishable from a legitimate run)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: a supplied base ref is used only when it resolves, is an ancestor of HEAD, and
  is not HEAD itself on a clean tree, reporting `base_source=arg`; any failure of those three
  reports `base_source=none` and `protected=undetermined` without falling back to
  auto-detection; `gates.sh full HEAD` on a clean tree reports `undetermined` and not `none`;
  tests 13, 14, 15 and 16 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Blocked on #46 (slice 0 — `resolve_base`, whose `$2` branch this slice adds).
  Closes a real, previously-exploitable bypass of the existing
  `Bash(./.claude/scripts/gates.sh:*)` prefix rule.

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-09-15 (re-derived independently; unchanged since filed 2026-08-31)
- repro: confirmed (verified in a throwaway repo: an add-only 5-line change reported
  `code_lines=0` under a naive `git diff --numstat`, since it cannot see untracked files)
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md,
  tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `gates.sh full` reports `code_lines=<n>` counting tracked changes and untracked
  non-documentation additions, plus `code_lines_committed=<n>` reproducing Charter §7's own
  invocation; `docs/**` and `**/*.md` are excluded from both; `code_lines` is `not-measured`
  at `fast` and `undetermined` when the base is undetermined;
  `.claude/skills/factory-verify/SKILL.md` states that `code_lines` is excluded from its "a
  mismatch is the finding" comparison; tests 20, 21, 22, 23 and 24 pass; no pre-existing test
  file is modified; gates GREEN at `deep`
- confidence: medium
- notes: Blocked on #46 (slice 0). Deliberately droppable per gate 1 — slices 0–4 close the
  §3 hole and stand alone without it. Touches two load-bearing files, so needs the human
  in-session twice.

---

## Charter compliance gap — carried forward, still open

Five label/comment changes on #23 and #46 (2026-08-31 evening through 2026-09-02) still have
no corresponding `docs/factory/runs/` record on `main`. Every triage run since (2026-09-01
through 2026-09-14, PRs #52–#65) has independently re-derived those dispositions and reached
the same conclusion the live labels already show — nothing is currently mislabeled — but the
durable-evidence trail for that specific window remains a real, unresolved gap. Not this
run's to fix: the contract requires a run record per run, and no mechanism exists to
retroactively backfill one for a run this session did not perform.

## Charter gap — no mechanism for a triage routine's own unmerged backlog

**This is the sixteenth consecutive scheduled `factory-triage` PR to find zero label
changes**, and the count is still climbing. PRs #52 through #65 (2026-09-01 through
2026-09-14) are all still open and unmerged; this run's PR joins them in the same state.
Every one independently reached the same zero-change conclusion against live GitHub state —
this is not compounding staleness, each run re-queried GitHub directly rather than trusting a
prior PR's snapshot — but the PRs themselves are accumulating with no consolidation. Prior
runs proposed candidate fixes (stop opening a new PR after N no-op cycles; comment on the
latest open one instead; have a human merge the most recent snapshot and close the rest
without merging). None has been acted on, and deciding that policy is out of scope for a
triage run: it would mean editing the triage skill itself, `.claude/skills/factory-triage/**`,
which is Charter §2 `LOAD_BEARING`. **This is now the single highest-value thing for a human
to act on** — the fix is cheap (close #52–#65 without merging, keep only the most recent
snapshot) and every day it is deferred adds one more identical PR to the pile.

## Do not merge `archive/fq-5-slice0-original`

It is green and most of its lines are reused across the now-merged #5 and #18, but it *is*
the 515-line diff the Charter §7 ceiling stopped. It is a cherry-pick source only. Delete the
archive once its last consumer (already merged) is confirmed by a human read.
