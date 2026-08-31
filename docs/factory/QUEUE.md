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

_Snapshot written by `factory-triage` on 2026-08-31, superseding the `factory-spec` snapshot
of 2026-08-30 (PR #14). Live labels are the source of truth._

Since the prior snapshot, slices #5, #18, #6 and #7 merged to `main`, unblocking #9, #10 and
the newly-split #28. This run re-derived all 8 currently-open issues against
`CHARTER.md` §2, §4 and §7, found #9, #10 and #28 blocker-free, and promoted them from
`wait-to-implement` to `ready-to-implement`. #8, #11, #12, #23 were re-derived and left
unchanged. #3 remains the tracking issue, still blocked on its own slices.

Counts: ready-to-implement=3 (#9, #10, #28), ready-to-spec=3 (#11, #12, #23),
awaiting-review=1 (#8), wait-to-implement=1 (#3), needs-info=0.

## Claimable now

## FQ-28: integration slice 3b — digest delivery
- disposition: ready-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/28
- last_triaged: 2026-08-31
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: tests/integration/digest-delivery.integration.test.ts
- load_bearing: false
- gate_level: full
- done_when: tests 16 and 17 pass in a new file against a spawned entrypoint driving its own digest cadence; test 16 asserts both the absence of an individual card and the presence of the escalation in a delivered digest; test 17 asserts the resolved entry carries no `actions` block; no file under `src/` and no existing test file is modified
- confidence: medium
- notes: Split out of #8 during implementation (undeclared dependency on #7's `server-proc.ts`). Blocker (#7, PR #27, `79f4c53`) merged 2026-08-30. Promoted this run. `confidence: medium` — real-timer digest cadence in a child process plus severity-band arithmetic are two things that must both be right. A human should still confirm the 3a/3b split named in #8 and #29 before this lands.

## FQ-10: integration slice 5 — restart boundary tripwire
- disposition: ready-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/10
- last_triaged: 2026-08-31
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: tests/integration/restart-boundary.integration.test.ts
- load_bearing: false
- gate_level: full
- done_when: work created before `SIGTERM` is absent after a restart on the same port; test carries a comment naming it as the tripwire a durable store must deliberately flip; no file under `src/` is modified
- confidence: high
- notes: Blocker was #7 (slice 2, `server-proc.ts`). Merged 2026-08-30 as `79f4c53` (PR #27). Promoted this run. ~70 lines estimated, smallest of the remaining slices.

## FQ-9: integration slice 4 — resources and concurrent agents
- disposition: ready-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/9
- last_triaged: 2026-08-31
- repro: not-attempted (new test coverage, not a bug report)
- files_expected: tests/integration/resources.integration.test.ts, tests/integration/concurrent-agents.integration.test.ts
- load_bearing: false
- gate_level: full
- done_when: tests 18–24 pass; test 19 fails if the bare `workitem://{id}` template is registered before the more specific ones; the concurrency file carries the gate-2 scope note that these prove await-interleaving safety only; no file under `src/` is modified
- confidence: high
- notes: Blocker was #18 (slice 0b — the tap, needed only for test 24). #18 closed `completed` 2026-08-30. All of 18–24 unblocked, not just 18–23. Promoted this run in full. ~250 lines estimated.

---

## In review

## FQ-8: integration slice 3a — Slack delivery and failure modes
- disposition: awaiting-review
- source: https://github.com/RoscoeLotriet/purview/issues/8
- last_triaged: 2026-08-31
- repro: confirmed (tests 12–15 pass, gates GREEN at full)
- files_expected: tests/integration/slack-delivery.integration.test.ts
- load_bearing: false
- gate_level: full
- done_when: tests 12–15 pass; test 15 scoped to the escalation record's own fields with a comment naming #12 as the reason it will later be inverted; no file under `src/` modified
- confidence: high
- notes: PR #29 open (draft), verifier accepted with reservations (all fixed). Not re-triaged into a queue-state disposition — `awaiting-review` is the correct state for an issue with an open PR and belongs to a human's decision, not to this run's four dispositions. Scope narrowed in place from tests 12–17 to 12–15; tests 16–17 are #28.

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
- done_when: all of #5, #18, #6, #7, #8, #9, #10, #28 merged
- confidence: high
- notes: #5, #18, #6, #7 merged. #8 in review (PR #29). #9, #10, #28 promoted to `ready-to-implement` this run. Closes when the rest land.

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

---

## Do not merge `archive/fq-5-slice0-original`

It is green and most of its lines are reused across the now-merged #5 and #18, but it *is*
the 515-line diff the Charter §7 ceiling stopped. It is a cherry-pick source only. Delete the
archive once its last consumer (already merged) is confirmed by a human read.
