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

_Snapshot written by `factory-triage` on 2026-08-30, superseding the `factory-spec` snapshot
of 2026-08-29. Live labels are the source of truth._

All 9 open issues were re-triaged this run because each had been updated since the prior
triage sweep (2026-08-28T23:08:31Z) — mostly by `factory-spec`'s FQ-3 gates and by an
implementation attempt on #5. Every disposition below was independently re-derived from the
charter; in every case it matched the live label already on the issue, so **no labels
changed**. The one substantive correction is to this file: the prior snapshot (written before
the #5 implementation attempt) still listed FQ-5 as `ready-to-implement` and "claimable now."
It was demoted back to `ready-to-spec` on 2026-08-29T00:39:19Z after the attempt measured the
diff at ~515 changed lines against the charter's 400-line `STOP_IF` ceiling. This snapshot now
matches the live label.

## Claimable now

_(none — see "Needs a human spec run" below; FQ-5 is queued for a spec decision, not
claimable by `factory-implement` as currently scoped)_

## Blocked on a named dependency

## FQ-3: integration suite covering the step-1 seams (parent)
- disposition: wait-to-implement · **blocked on its own slices — #5, #6, #7, #8, #9, #10**
- source: https://github.com/RoscoeLotriet/purview/issues/3
- last_triaged: 2026-08-30
- repro: not-attempted (new coverage / spec work, nothing to reproduce)
- files_expected: tests/integration/**, vitest.config.ts, package.json
- load_bearing: false
- gate_level: full
- done_when: all six slice issues are merged; `tests/integration/` covers gaps 1–6 with
  tests that fail when the wiring they cover is broken; integration and unit suites
  separately invocable and both green; no `src/` file and no pre-existing test file modified
- confidence: high
- notes: superseded as a directly-implementable item by the FQ-3 spec (all 4 gates approved
  2026-08-29); the work now lives in the slices below.

## FQ-6: integration slice 1 — round-trip edge cases
- disposition: wait-to-implement · **blocked on #5**
- source: https://github.com/RoscoeLotriet/purview/issues/6
- last_triaged: 2026-08-30
- repro: not-attempted (new coverage, nothing to reproduce)
- files_expected: tests/integration/escalation-round-trip.integration.test.ts
- load_bearing: false
- gate_level: full
- done_when: tests 2–5 pass; test 3 proves non-release via `stillPending`, not a status
  code; test 5 uses a 1s timeout with real timers; no file under `src/` modified
- confidence: high
- notes: promote to `ready-to-implement` when #5 merges.

## FQ-7: integration slice 2 — bootstrap and configuration
- disposition: wait-to-implement · **blocked on #5**
- source: https://github.com/RoscoeLotriet/purview/issues/7
- last_triaged: 2026-08-30
- repro: not-attempted (new coverage, nothing to reproduce)
- files_expected: tests/integration/harness/server-proc.ts, tests/integration/bootstrap-config.integration.test.ts
- load_bearing: false
- gate_level: full
- done_when: tests 6–11 pass against the real entrypoint spawned as a child process; test 8
  characterizes the unsigned-interaction endpoint; no file under `src/` modified
- confidence: medium
- notes: flakiest slice. Retries or sleeps beyond one `EADDRINUSE` retry mean the entrypoint
  is not testable as written — file the `src/` config-extraction issue instead. Blocks #10.

## FQ-8: integration slice 3 — Slack delivery and failure modes
- disposition: wait-to-implement · **blocked on #5**
- source: https://github.com/RoscoeLotriet/purview/issues/8
- last_triaged: 2026-08-30
- repro: not-attempted (new coverage, nothing to reproduce)
- files_expected: tests/integration/slack-delivery.integration.test.ts
- load_bearing: false
- gate_level: full
- done_when: tests 12–17 pass; test 15 is scoped to the escalation record's own fields and
  commented as the placeholder for #12
- confidence: high
- notes: test 15 is #12's acceptance test in its pre-fix form.

## FQ-9: integration slice 4 — resources and concurrent agents
- disposition: wait-to-implement · **blocked on #5**
- source: https://github.com/RoscoeLotriet/purview/issues/9
- last_triaged: 2026-08-30
- repro: not-attempted (new coverage, nothing to reproduce)
- files_expected: tests/integration/resources.integration.test.ts, tests/integration/concurrent-agents.integration.test.ts
- load_bearing: false
- gate_level: full
- done_when: tests 18–24 pass; test 19 fails if the bare `workitem://{id}` template is
  registered before the more specific ones
- confidence: high
- notes: held to wave 3 only for the review cap; no technical dependency beyond #5, so
  promote early if a wave-2 item is rejected.

## FQ-10: integration slice 5 — restart boundary tripwire
- disposition: wait-to-implement · **blocked on #7**
- source: https://github.com/RoscoeLotriet/purview/issues/10
- last_triaged: 2026-08-30
- repro: not-attempted (new coverage, nothing to reproduce)
- files_expected: tests/integration/restart-boundary.integration.test.ts
- load_bearing: false
- gate_level: full
- done_when: test 25 passes and is commented as a tripwire a durable store must
  deliberately flip
- confidence: high
- notes: deliberately near-tautological; first test to cut if the suite runs long.

---

## Needs a human spec run

## FQ-5: integration slice 0 — harness and the tracer round trip
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/5
- parent: #3 · spec: `docs/factory/specs/FQ-3/`
- last_triaged: 2026-08-30
- repro: not-attempted (spec-scoping decision, nothing to reproduce)
- files_expected: docs/factory/specs/FQ-3/04-slices.md
- load_bearing: false
- gate_level: full
- done_when: slice 0 is re-cut into pieces that each fit under the charter's 400-line
  ceiling, and the charter's position on modifying harness and integration test files in
  later slices is decided
- confidence: high
- notes: demoted from `ready-to-implement` on 2026-08-29 after an implementation attempt
  (`claude/fq-5`) built the slice in full, gates went GREEN, but the diff measured ~515
  changed lines against the charter's 400-line `STOP_IF` ceiling — over even after
  excluding blank/comment-only lines (~404) and after dropping everything not consumed by
  the tracer test (~439). No PR was opened; the branch stands as measurement evidence, not
  a proposal. Needs a human split decision (see the issue's second handoff comment for the
  proposed 0a/0b cut) before this can move back to `ready-to-implement`. Blocks #6–#9.

## FQ-11: run the factory gates automatically on every push
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/11
- last_triaged: 2026-08-30
- repro: not-attempted (CI/config decision, nothing to reproduce)
- files_expected: docs/factory/specs/FQ-11/**
- load_bearing: **true** — `.github/workflows/**` is a Charter §2 load-bearing path, forcing
  `deep` gates and a human read
- gate_level: deep
- done_when: a spec exists deciding gate level per path (full vs. deep), whether the gates
  check is required for merge, whether the integration suite runs in CI at all, and
  runner/Node version — approved through factory-spec's human gates
- confidence: medium
- notes: surfaced by the FQ-3 spec (gate 2). Nothing runs the gates automatically today.
  Held behind #5–#10 for review-queue budget, not a technical dependency.

## FQ-12: record Slack delivery outcome so a dropped escalation is observable
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/12
- last_triaged: 2026-08-30
- repro: not-attempted (product-intent decision, nothing to reproduce)
- files_expected: docs/factory/specs/FQ-12/**
- load_bearing: false
- gate_level: full
- done_when: a spec decides what delivery outcome is recorded, who/how it surfaces,
  whether a failed delivery should change escalation behaviour, and whether this is v0
  scope at all — approved through factory-spec's human gates; FQ-3 slice 3's test 15 (#8)
  is then inverted from placeholder to acceptance test
- confidence: medium
- notes: surfaced by the FQ-3 spec (gate 3). `src/service/purview.ts:727-736` swallows
  every bridge failure, so a misconfigured webhook and a failed product premise produce the
  same dashboard. Open decisions include whether delivery failure should change behaviour,
  not just be observable.

---

## Wave plan for FQ-3

Charter §7 halts the factory above 3 items awaiting human review, so this is a constraint:

| Wave | Slices | Review load |
|---|---|---|
| 1 | #5 | 1 PR — everything depends on it, but #5 itself is back at `ready-to-spec` pending the split decision |
| 2 | #6, #7, #8 | 3 PRs — at the cap |
| 3 | #9, #10 | 2 PRs |
