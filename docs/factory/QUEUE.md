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

_Snapshot rebuilt by `factory-triage` on 2026-09-21, from live GitHub labels and comments —
not from the stale copy on `main`, which predates FQ-3's completion, #23's post-spec split
into #46–#51, and the filing of #32/#33/#40/#41. Live labels are the source of truth._

**This is the twenty-first consecutive daily triage run to reach an identical result.**
Every re-derivation against `docs/factory/CHARTER.md` below matched the label and handoff
comment already live on GitHub. **No labels changed. No handoff comments changed.** 13 open
issues, 0 untriaged, 11 re-examined (updated since the last triage run merged to `main`,
2026-08-31T06:06:46Z), 2 not re-examined (#11, #12 — unchanged since 2026-08-29). 0 skipped
(cap is 20).

Counts: `ready-to-implement=0`, `ready-to-spec=6` (#11, #12, #32, #33, #40, #41),
`wait-to-implement=7` (#23, #46, #47, #48, #49, #50, #51), `needs-info=0`,
`awaiting-review=0`.

**Nothing on GitHub has changed since 2026-09-02.** The queue is correctly labeled but has
been stalled for nearly three weeks behind two actions only a human can take — see "What is
actually blocking this queue" below. PRs #52 through #71 (twenty of them, 2026-09-01 through
2026-09-20) are open, unmerged, and each superseded by the next day's identical snapshot.

## What is actually blocking this queue

1. **An attended session to approve `.claude/scripts/gates.sh` edits** for the fully-specced
   FQ-23 slice chain (#23 parent, #46–#51). Every slice's `files_expected` includes a
   Charter §2 `LOAD_BEARING`, `Edit`-denied path. No unattended run can complete one of these
   regardless of label — #46 was tried once (2026-09-01) and self-corrected back to
   `wait-to-implement` after confirming exactly this.
2. **A `factory-spec` run on six `ready-to-spec` items** (#11, #12, #32, #33, #40, #41). The
   review queue is empty, so nothing in Charter §7 is holding this back — it is waiting on a
   human choosing to run `factory-spec`.

## A durable-evidence gap, restated because it is still open

`docs/factory/specs/FQ-23/` is cited by #23 and all six of its slice issues (#46–#51) as a
four-gate, human-approved spec ("Spec: `docs/factory/specs/FQ-23/`, gate 4 approved
2026-08-31"). **That directory does not exist** — not on `main`, and not on any of this
repository's 45 remote branches, confirmed this run by fetching all branches and searching
`git ls-tree` over the path on each one. The only spec directory that exists anywhere in the
repo is `docs/factory/specs/FQ-3/`. This was first found on 2026-09-06 and every daily triage
run since has restated it without a human resolving it. Either the spec artifacts were
written and never pushed, or seven issues are citing a human approval that has no
corresponding record. This is not a reason to change any label — the slices' scope is well
described in the issue bodies regardless of whether the spec directory survived — but it is
worth a human confirming which of those two happened before the FQ-23 chain is implemented
against a spec nobody can currently read.

`archive/fq-5-slice0-original`, previously noted here as a cherry-pick-only branch to delete
once its last consumer was confirmed, no longer exists as a remote branch — resolved,
dropping that note.

---

## Blocked — needs an attended human session

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically, not just in prose
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-02 (re-derived 2026-09-21, unchanged)
- repro: confirmed (an unattended run gets `FACTORY_GATES status=GREEN` even when it has
  modified a protected test file — the rule is prose-only today)
- files_expected: (none — this is now the FQ-23 slice-chain tracking issue)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged (#51 is gate 1's deliberately droppable §7
  line-ceiling slice and its non-merge does not block closing this item)
- confidence: high
- notes: `factory-spec` took this through all four gates and filed six slice issues; see the
  durable-evidence gap above — the spec directory those gates are said to have approved does
  not currently exist in the repository. Every slice needs a human in session to approve a
  `.claude/scripts/gates.sh` (and, for #51, also `.claude/skills/factory-verify/SKILL.md`)
  edit; none of them are completable by an unattended run regardless of label.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-02 (re-derived 2026-09-21, unchanged)
- repro: confirmed (verified during spec: bash 3.2's `set -u` dies on an empty array
  expansion, which would silently delete the `FACTORY_GATES:` line)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts, tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `gates.sh full` prints a FACTORY_GATES line carrying `base_source=`,
  `protected_globs=` and `protected=`; `gates.sh fast` prints `base_source=not-measured
  protected=not-measured`; a bash older than 3.2 prints `misconfigured=unsupported-bash` and
  exits 2; tests 17, 26 and the tracer test pass; no pre-existing test file is modified;
  gates GREEN at `deep`
- confidence: high
- notes: An unattended implement run claimed this 2026-09-01, correctly stopped at Contract
  rule 2 (no unattended edit under `.claude/`), and self-corrected `ready-to-implement` →
  `ready-to-spec`; triage on 2026-09-02 re-labeled `wait-to-implement` for consistency with
  its already-correct siblings, since nothing about scope is undecided — the blocker is a
  human choosing to sit in an attended session, which `wait-to-implement` names accurately
  and `ready-to-spec` does not. Root of the chain: #47 and #50 both block on this slice.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires: charter parse and real diff
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-08-31 (re-derived 2026-09-21, unchanged)
- repro: not-attempted (new mechanism, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts, tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: modifying a pre-existing `TESTS_PROTECTED`-glob file reports its path in
  `protected=` while `status` stays GREEN; adding a new file under the same glob reports
  `protected=none`; `protected_globs` matches the count actually parsed from `CHARTER.md`;
  tests 1, 2, 3, 7 and 8 pass (pre-agreed seam: land 1/2/3/7 and split test 8 into 1b if the
  slice measures over the Charter §7 ceiling); no pre-existing test file is modified; gates
  GREEN at `deep`
- confidence: high
- notes: blocked_on #46 (needs `resolve_base` and the field plumbing). Blocks #48 and #49.

## FQ-48: gates.sh slice 2 — diff shape: deletion, rename, committed state, empty-pathspec guard
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-08-31 (re-derived 2026-09-21, unchanged)
- repro: not-attempted (new mechanism, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: deleting a protected file reports its path; renaming one away reports it; a
  committed modification reports identically to an uncommitted one; a charter yielding zero
  globs never invokes `git diff` with an empty pathspec; tests 4, 5, 6 and 19 pass; no
  pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #47 (refines `measure_protected`). Test 19 is flagged in the issue as the
  one to review hardest — an unguarded zero-glob parse would report every changed file as a
  protected modification.

## FQ-49: gates.sh slice 3 — charter fidelity: §3 flag, anchored parse, fail-closed degradation
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-08-31 (re-derived 2026-09-21, unchanged)
- repro: confirmed (`TESTS_PROTECTED:` also appears unanchored in backticked prose at
  `CHARTER.md:74`, so an unanchored match would hit twice)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `TESTS_ARE_LOAD_BEARING: false` reports `not-enforced`; an absent or renamed
  `TESTS_PROTECTED:` block reports `undetermined`, never `none`; a charter given a fourth
  glob reports `protected_globs=4` and catches a file matching only the new glob; a
  truncated block is visible in `protected_globs`; a deleted charter still prints a
  FACTORY_GATES line; tests 9, 10, 11, 12 and 18 pass; no pre-existing test file is modified;
  gates GREEN at `deep`
- confidence: high
- notes: blocked_on #47 (completes `parse_charter_section3`). Two known limits (a truncating
  parse is visible but not detected; a glob typo is a real unmitigated hole) are pinned as
  accepted residual risk, not defects for this slice to fix.

## FQ-50: gates.sh slice 4 — base-ref override, and the 'full HEAD' bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-08-31 (re-derived 2026-09-21, unchanged)
- repro: confirmed (`./.claude/scripts/gates.sh full HEAD` on this repository prints a real
  short SHA with an empty diff — `protected=none code_lines=0` — indistinguishable from a
  legitimate run, and permitted by the existing `Bash` prefix rule in `settings.json`)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: a supplied base ref is used only when it resolves, is an ancestor of `HEAD`, and
  is not `HEAD` itself on a clean tree, reporting `base_source=arg`; any failure of those
  three reports `base_source=none` (never falls back to auto-detection); `gates.sh full HEAD`
  on a clean tree reports `undetermined`, not `none`; tests 13, 14, 15 and 16 pass; no
  pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: blocked_on #46 (adds the `$2` branch to `resolve_base`). Closes a verified bypass,
  not a hypothesised one.

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-08-31 (re-derived 2026-09-21, unchanged)
- repro: confirmed (`git diff --numstat` cannot see an untracked file; verified an add-only
  5-line change measures `code_lines=0` without the untracked-count fix)
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md, tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `gates.sh full` reports `code_lines=<n>` (tracked + untracked non-doc additions)
  and `code_lines_committed=<n>` (Charter §7's own invocation); both exclude `docs/**` and
  `**/*.md`; `code_lines` is `not-measured` at `fast` and `undetermined` when the base is
  undetermined; `factory-verify/SKILL.md` states `code_lines` is excluded from its
  mismatch-is-the-finding comparison; tests 20–24 pass; no pre-existing test file is
  modified; gates GREEN at `deep`
- confidence: medium
- notes: blocked_on #46. Deliberately droppable — gate 1 approved the §7 ceiling as
  independently reversible from the §3 enforcement the rest of the chain closes.
  `confidence: medium` because the untracked-lines reasoning is the newest in the item.

---

## Needs a human spec run

## FQ-11: run the factory gates automatically on every push
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/11
- last_triaged: 2026-08-31 (not re-examined this run — unchanged since 2026-08-29)
- repro: not-attempted (no CI exists yet — nothing to reproduce)
- files_expected: .github/workflows/**
- load_bearing: true
- gate_level: deep
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: `.github/workflows/**` is Charter §2 `LOAD_BEARING`, which Charter §4 `NEEDS_SPEC`
  names directly.

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
- notes: Product-intent decision (what gets recorded, whether delivery failure changes
  escalation behaviour) — Charter §4 `NEVER_AUTOMATE` names product intent directly.

## FQ-32: four run records carry timestamps an hour off, minted from local time and labelled Z
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/32
- last_triaged: 2026-09-01 (re-derived 2026-09-21, unchanged)
- repro: confirmed (four run records anchored against PR/commit timestamps are each off by
  exactly one hour, in inconsistent directions)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md, docs/factory/runs/2026-08-30T235500Z-implement-8.md, docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md, docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever `.claude/skills/**` change the approved spec adds for the minting rule
- load_bearing: true
- gate_level: deep
- done_when: a spec exists (or an explicit scope decision) separating the docs-only
  correction from the skill-minting-rule change, approved through factory-spec's human gates
- confidence: medium
- notes: The docs-only correction half matches Charter §4 `AUTOMATABLE`
  ("Documentation and comment corrections"); the prevention-rule half touches
  `.claude/skills/**`, Charter §2 `LOAD_BEARING`, forcing `ready-to-spec` for the item as a
  whole. `confidence: medium` because the disposition itself is not in doubt — only whether
  a spec splits this into an implementable docs slice plus a specced skill-rule slice.

## FQ-33: a PR body's prose can silently close a queue item — two have already gone
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-01 (re-derived 2026-09-21, unchanged)
- repro: confirmed (#28 was closed by PR #29's body containing "close #28"; #26 shows the
  same outcome via a different, unconfirmed mechanism)
- files_expected: docs/factory/specs/FQ-33/** (and whatever `.claude/skills/**` change the
  approved spec adds)
- load_bearing: true
- gate_level: deep
- done_when: the implement routine cannot open a PR whose body would close an issue it did
  not intend to close, and the rule is stated where a human will find it before the next
  accidental close
- confidence: high
- notes: Fix touches `.claude/skills/factory-implement/**` at minimum (PR body composition),
  Charter §2 `LOAD_BEARING`. Worth prioritizing — the review queue is empty, so nothing else
  is competing for the human-attention budget this would spend.

## FQ-40: workitem://{id}/tree is unreadable unless both depth and attention_only are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-01 (re-derived 2026-09-21, unchanged)
- repro: confirmed (measured over the real transport: bare, `?depth=1` and
  `?attention_only=true` all return `Resource not found`; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Changes a public MCP read surface (a resource template's URI-matching behaviour),
  which Charter §4 `NEEDS_SPEC` names directly. Not on the `LOAD_BEARING` glob list, so
  `full` gates once specced, not `deep`.

## FQ-41: the claim protocol locks the branch, not the working tree
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-01 (re-derived 2026-09-21, unchanged)
- repro: confirmed (observed 2026-08-31: two local implement runs in one checkout collided
  when `git switch` moved `HEAD` out from under a live run on #28)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/** (and whatever
  the approved spec adds)
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding whether an implement run must isolate its checkout, how a
  run detects it is not alone before switching branches, what a run does on detected
  contention, and whether `factory-verifier`'s clean-checkout requirement becomes a
  first-class precondition of the claim protocol — approved through factory-spec's human
  gates
- confidence: high
- notes: Both runs in the observed collision won their claims correctly — the remote ref is a
  lock on issue ownership, not on the local checkout. Not urgent (nothing broken on `main`),
  but real.
