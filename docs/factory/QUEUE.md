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

_Snapshot updated by `factory-spec` on 2026-08-31 (gate 4 revision 3), superseding the
`factory-triage` snapshot of the same day. Live labels are the source of truth._

**This is a spec-run update, not a re-triage.** It writes the two slices gate 4 revision 3
approved, files two findings from the FQ-9 implement run, and corrects the entries the prior
snapshot has since outlived. Nothing was re-derived against `CHARTER.md`; the entries carried
forward below still say `last_triaged: 2026-08-31` from the triage run that wrote them.

Since the prior snapshot, #10 (PR #31), #26 (PR #36) and #28 (PR #37) all merged, and #8 was
merged as PR #29 — so every FQ-3 slice except 4a and 4b is on `main`. #9 was claimed, written
in full, measured at 488 lines against the Charter §7 ceiling, and split into #38 and #39; it
is closed as split with no queue-state label.

Counts: ready-to-implement=2 (#38, #39), ready-to-spec=5 (#11, #12, #23, #40, #41),
awaiting-review=0, wait-to-implement=1 (#3), needs-info=0.

**The review queue is empty**, so both claimable items may run at once without approaching the
Charter §7 limit of three.

## Claimable now

## FQ-38: integration slice 4a — resources
- disposition: ready-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/38
- last_triaged: 2026-08-31 (written by factory-spec, gate 4 revision 3)
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: tests/integration/resources.integration.test.ts
- load_bearing: false
- gate_level: full
- done_when: tests 18–20 pass; test 19 asserts both that `workitem://{id}/tree` resolves to the tree resource and that `resources/templates/list` places the bare `workitem://{id}` template after the more specific ones, so it fails if the registrations are reordered; no file under `src/` is modified; gates GREEN at `full`
- confidence: high
- notes: Split out of #9 on measurement. **208 lines measured, not estimated** — the work exists on `claude/fq-9` at `547a4ac`, green, as a clean cherry-pick. That branch must not become a PR as it stands. Test 19 has two halves and both are required: revision 2's premise that reordering lets the bare template swallow the tree URI was tested by hand and is false with the SDK in this lockfile, so the order assertion reaches the invariant through `resources/templates/list` instead. Every tree URI must spell out both query variables (#40).

## FQ-39: integration slice 4b — concurrent agents
- disposition: ready-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/39
- last_triaged: 2026-08-31 (written by factory-spec, gate 4 revision 3)
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: tests/integration/concurrent-agents.integration.test.ts
- load_bearing: false
- gate_level: full
- done_when: tests 21–24 pass; the file carries the gate-2 scope note that these prove `await`-interleaving safety only, not thread safety and not multi-process safety; no file under `src/` is modified; gates GREEN at `full`
- confidence: high
- notes: Split out of #9 on measurement. **280 lines measured, not estimated** — same parked branch, same cherry-pick, same prohibition on turning it into a PR. The scope note is a `done_when` clause: Node is single-threaded and without it these four tests get cited as proof of thread safety. Independent of #38; neither blocks the other.

---

## Blocked on its own slices

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
- notes: Eight of ten slices are on `main`; 19 of 26 tests have landed. Only #38 and #39 remain. `done_when` restated this run because #9 no longer exists as a slice — it split into #38 and #39 — and because #26 was never listed, having been split out of #7 during implementation.

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
- notes: Unchanged this run. `.github/workflows/**` is Charter §2 `LOAD_BEARING`, which Charter §4 `NEEDS_SPEC` names directly.

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
- notes: Unchanged this run. Product-intent decision (what gets recorded, whether delivery failure changes escalation behaviour) — Charter §4 `NEVER_AUTOMATE` names product intent directly. #8's test 15 is written to be inverted when this lands.

## FQ-23: gates.sh — enforce Charter §3 TESTS_PROTECTED mechanically, not just in prose
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/23
- last_triaged: 2026-08-31
- repro: not-attempted (a design gap, not a reproducible bug)
- files_expected: docs/factory/specs/FQ-23/**
- load_bearing: true
- gate_level: deep
- done_when: a spec exists deciding (a) how gates.sh obtains a base ref and what it reports when it cannot, (b) how an approved interactive test-file edit passes without a reachable agent bypass, (c) whether it is a new gate name or folded into an existing one, and (d) whether the §7 line ceiling is enforced in the same pass — approved through factory-spec's human gates
- confidence: medium
- notes: Unchanged this run. `.claude/scripts/gates.sh` and `.factory/gates.conf` are both Charter §2 `LOAD_BEARING`, forcing `ready-to-spec` regardless of size. Not urgent — no CI exists (#11), no monitor run has ever fired, so there is no live unattended run this gap currently exposes.

## FQ-40: `workitem://{id}/tree` is unreadable unless both `depth` and `attention_only` are supplied
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/40
- last_triaged: 2026-08-31 (filed by factory-spec from the FQ-9 implement run)
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
- last_triaged: 2026-08-31 (filed by factory-spec from the FQ-9 implement run)
- repro: confirmed (observed 2026-08-31: creating `claude/fq-9` moved `HEAD` out from under a live run on #28 in the same checkout)
- files_expected: docs/factory/CONTRACT.md, .claude/skills/factory-implement/**
- load_bearing: true
- gate_level: deep
- done_when: a spec exists and is approved through factory-spec's human gates
- confidence: high
- notes: Both runs won their claims correctly; the remote ref is a lock on issue ownership and it worked. The unprotected resource is the local checkout. Failure mode is silent, cross-contaminating and invisible to the gates — a disrupted run's commit lands on the other run's branch, inside the other run's PR. An agent may not rewrite its own claim protocol unattended in any case.

---

## Do not merge `archive/fq-5-slice0-original`

It is green and most of its lines are reused across the now-merged #5 and #18, but it *is*
the 515-line diff the Charter §7 ceiling stopped. It is a cherry-pick source only. Delete the
archive once its last consumer (already merged) is confirmed by a human read.
