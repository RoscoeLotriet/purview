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

_Snapshot rebuilt by `factory-triage` on 2026-09-09 from live GitHub labels._

**13 open issues, all already carrying a `factory:` state label — none untriaged.** 11 of
the 13 were updated since the prior recorded triage run
(`docs/factory/runs/2026-08-31T060646Z-triage-run.md`, `finished_at: 2026-08-31T06:08:15Z`)
and were re-examined against `CONTRACT.md` and `CHARTER.md` directly, independently of their
existing label. **#11 and #12 were not re-examined** — neither has been updated since
2026-08-29, before even the prior triage run, and the skill's scope rule does not revisit an
already-triaged, untouched item. #3 (the FQ-3 parent) has closed (`completed`, closed by the
human 2026-08-31) since the prior snapshot and is no longer part of the live queue.

**This run changed no labels and posted no new handoff comments.** Every re-examined issue's
current label and its existing `factory-handoff:v1` comment (most dated 2026-09-01T06:18–19Z,
one — #46 — dated 2026-09-02T06:05Z) already matched what an independent re-derivation against
the charter produces. Details per item below.

Counts: ready-to-implement=0, ready-to-spec=6 (#11, #12, #32, #33, #40, #41),
wait-to-implement=7 (#23, #46, #47, #48, #49, #50, #51), needs-info=0, awaiting-review=0.

**The review queue is empty**, so this is not the reason nothing is `ready-to-implement` —
every FQ-23 slice is blocked on an attended human session (see below), and every
`ready-to-spec` item is blocked on a human `factory-spec` run.

## Blocked on an attended human session (FQ-23 chain)

Every slice below has its edit surface entirely inside `.claude/scripts/gates.sh` (or, for
#51, that plus `.claude/skills/factory-verify/SKILL.md`), both Charter §2 `LOAD_BEARING` and
`Edit`-denied for unattended runs in `.claude/settings.json`. `factory-spec` already took
FQ-23 through all four gates, human-approved 2026-08-31 — nothing here is an open design
question. The blocker is a human present in session to approve the `.claude/` edit
(`CONTRACT.md` rule 2), not further specification. An unattended `factory-implement` run
claimed #46 on 2026-09-01, correctly stopped at the charter check without editing anything,
and a later pass re-derived the label from the routed `ready-to-spec` to `wait-to-implement`
across the chain on 2026-09-02 for exactly this reason. This run's independent check agrees.

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically, not just in prose
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-09-09
- repro: not-attempted (a design gap, already specced — not a reproducible bug)
- files_expected: (none — parent tracking issue; each slice below carries its own)
- load_bearing: true
- gate_level: deep
- done_when: all of #46, #47, #48, #49, #50 merged; #51 is the deliberately droppable §7 line-ceiling slice and its non-merge does not block closing this item
- confidence: high
- notes: Confirmed unchanged. This issue is now the FQ-3-style parent tracking issue for the six-slice chain below, hence `wait-to-implement` rather than `ready-to-spec` — the spec decision it originally asked for has already been made and approved.

## FQ-46: gates.sh slice 0 — tracer: report fields exist and travel in the machine line
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/46
- last_triaged: 2026-09-09
- repro: not-attempted (new test coverage against an approved spec, not a bug report)
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-proc.ts, tests/integration/gates-tracer.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: an attended human session claims this issue and approves the `.claude/scripts/gates.sh` edit in-session (Contract rule 2); once that happens, `gates.sh full` prints a FACTORY_GATES line carrying `base_source=`, `protected_globs=` and `protected=`; `gates.sh fast` prints `base_source=not-measured protected=not-measured`; a bash older than 3.2 prints `misconfigured=unsupported-bash` and exits 2; the three tests pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Confirmed unchanged. First slice; nothing else blocks it but the attended-session requirement.

## FQ-47: gates.sh slice 1 — the Charter §3 report fires: charter parse and real diff
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/47
- last_triaged: 2026-09-09
- repro: not-attempted
- files_expected: .claude/scripts/gates.sh, tests/integration/harness/gates-charter.ts, tests/integration/gates-report.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: modifying a pre-existing TESTS_PROTECTED file reports its path in `protected=` while `status` stays GREEN; adding a new file under the same glob reports `protected=none`; `protected_globs` matches the charter's parsed count; tests 1, 2, 3, 7 and 8 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Confirmed unchanged. Blocked on #46 (slice 0, not yet merged) for the `resolve_base` and field plumbing this slice depends on.

## FQ-48: gates.sh slice 2 — diff shape: deletion, rename, committed state, empty-pathspec guard
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/48
- last_triaged: 2026-09-09
- repro: not-attempted
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-diff-shape.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: deleting a protected file reports its path; renaming one away reports it; a committed modification reports identically to an uncommitted one; a zero-glob charter never invokes `git diff` with an empty pathspec; tests 4, 5, 6 and 19 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Confirmed unchanged. Blocked on #47 (slice 1, not yet merged), which this slice refines.

## FQ-49: gates.sh slice 3 — charter fidelity: §3 flag, anchored parse, fail-closed degradation
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/49
- last_triaged: 2026-09-09
- repro: not-attempted
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-charter-fidelity.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `TESTS_ARE_LOAD_BEARING: false` reports `not-enforced`; a missing/renamed TESTS_PROTECTED block reports `undetermined`, never `none`; a fourth charter glob is picked up and reported; a truncated block is visible in `protected_globs`; a deleted charter still prints a FACTORY_GATES line; tests 9, 10, 11, 12 and 18 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Confirmed unchanged. Blocked on #47 (slice 1, not yet merged), which this slice completes.

## FQ-50: gates.sh slice 4 — base-ref override, and the 'full HEAD' bypass closed
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/50
- last_triaged: 2026-09-09
- repro: confirmed (the `gates.sh full HEAD` bypass was verified live against this repository during the spec — see issue body)
- files_expected: .claude/scripts/gates.sh, tests/integration/gates-base-ref.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: a supplied base ref is used only when it resolves, is an ancestor of HEAD, and is not HEAD itself on a clean tree (`base_source=arg`); any failure reports `base_source=none` and `protected=undetermined` without falling back to auto-detection; `gates.sh full HEAD` on a clean tree reports `undetermined`, not `none`; tests 13–16 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: high
- notes: Confirmed unchanged. Blocked on #46 (slice 0, not yet merged), whose `resolve_base` this slice extends.

## FQ-51: gates.sh slice 5 — Charter §7 line-ceiling measurement (droppable)
- disposition: wait-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/51
- last_triaged: 2026-09-09
- repro: not-attempted
- files_expected: .claude/scripts/gates.sh, .claude/skills/factory-verify/SKILL.md, tests/integration/gates-ceiling.integration.test.ts
- load_bearing: true
- gate_level: deep
- done_when: `gates.sh full` reports `code_lines=<n>` (tracked + untracked non-doc additions) and `code_lines_committed=<n>` (§7's own invocation); both exclude `docs/**` and `*.md`; `code_lines` is `not-measured` at `fast`, `undetermined` on an undetermined base; `factory-verify/SKILL.md` states `code_lines` is excluded from its mismatch comparison; tests 20–24 pass; no pre-existing test file is modified; gates GREEN at `deep`
- confidence: medium
- notes: Confirmed unchanged. Blocked on #46 (slice 0). Deliberately droppable — gate 1 approved the §7 ceiling as independently reversible from the §3 enforcement slices 0–4.

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
- notes: Not re-examined this run — unchanged since 2026-08-29, before the prior triage run. `.github/workflows/**` is Charter §2 `LOAD_BEARING`, which Charter §4 `NEEDS_SPEC` names directly.

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
- notes: Not re-examined this run — unchanged since 2026-08-29. Product-intent decision (what gets recorded, whether delivery failure changes escalation behaviour) — Charter §4 `NEVER_AUTOMATE` names product intent directly. #8's test 15 is written to be inverted when this lands.

## FQ-32: docs(factory): four run records carry timestamps an hour off, minted from local time and labelled Z
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/32
- last_triaged: 2026-09-09
- repro: confirmed (each of the four records' true UTC window is independently anchored to a git or GitHub timestamp — see issue body)
- files_expected: docs/factory/runs/2026-08-30T232000Z-implement-7.md, docs/factory/runs/2026-08-30T235500Z-implement-8.md, docs/factory/runs/2026-08-30T214126Z-tune-tests-protected.md, docs/factory/runs/2026-08-30T174947Z-implement-5.md, and whatever `.claude/skills/**` change the approved spec adds for the minting rule
- load_bearing: true
- gate_level: deep
- done_when: a spec exists (or an explicit scope decision) separating the docs-only correction from the skill-minting-rule change, approved through factory-spec's human gates
- confidence: medium
- notes: Confirmed unchanged. Splits into an automatable docs-only half (Charter §4 `AUTOMATABLE`, "documentation and comment corrections") and a `.claude/skills/**` prevention-rule half that is Charter §2 `LOAD_BEARING`. Filed as one issue; whether to split is the spec's call, not triage's.

## FQ-33: factory: a PR body's prose can silently close a queue item — two have already gone
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/33
- last_triaged: 2026-09-09
- repro: confirmed (#28 closed by PR #29's body containing a closing-keyword sentence; #26 closed the same way, mechanism unconfirmed)
- files_expected: docs/factory/specs/FQ-33/** (and whatever `.claude/skills/**` change the approved spec adds)
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding where the PR-body closing-keyword prohibition and its mechanical pre-`gh pr create` check live, and whether an implement run should ever write a closing keyword against a queue issue at all — approved through factory-spec's human gates
- confidence: high
- notes: Confirmed unchanged. Fix touches `.claude/skills/**` (`LOAD_BEARING`). Worth prioritizing: the review queue is currently empty (Charter §7), so nothing competes for the human-attention budget this would spend, and the defect is live — two issues already silently closed by this mechanism.

## FQ-40: mcp: workitem://{id}/tree is unreadable unless both depth and attention_only are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-09-09
- repro: confirmed (measured over the real transport: bare, `?depth=1` and `?attention_only=true` alone all return "Resource not found"; only both together match)
- files_expected: src/mcp/server.ts (and whatever the approved spec adds)
- load_bearing: false
- gate_level: full
- done_when: a spec exists deciding whether `depth` and `attention_only` should be individually optional, whether an unmatched-but-plausible `workitem://{id}/...` URI should return a more specific error, and whether the resource description should instead just state the requirement — approved through factory-spec's human gates
- confidence: high
- notes: Confirmed unchanged. Public MCP read-surface change (Charter §4 `NEEDS_SPEC`); not on the `LOAD_BEARING` glob list so `full` gates once specced, not `deep`.

## FQ-41: factory: the claim protocol locks the branch, not the working tree
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/41
- last_triaged: 2026-09-09
- repro: confirmed (observed 2026-08-31: `git switch -c claude/fq-9` moved HEAD out from under a live run on #28 in the same checkout)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/** (and whatever the approved spec adds)
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding whether an implement run must isolate its checkout, how a run detects it is not alone before switching branches, what a run does on detected contention, and whether the clean-checkout requirement becomes a first-class precondition of the claim protocol — approved through factory-spec's human gates
- confidence: high
- notes: Confirmed unchanged. Touches `CONTRACT.md`'s claim protocol and `factory-implement/**` — `LOAD_BEARING`; Charter §2's "an agent must not rewrite its own constraints" applies to the claim protocol as much as to `gates.sh`. Not urgent (nothing broken on `main`), but real.
