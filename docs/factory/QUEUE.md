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

_Snapshot written by `factory-triage` on 2026-08-29, superseding the `factory-spec` snapshot
of 2026-08-29 (#14). Live labels are the source of truth._

Triage's FQ-3 entry (`ready-to-spec`) is not lost, it is **completed**: that run independently
re-derived `ready-to-spec` from the charter, the spec then ran, and FQ-3 is now a parent whose
work lives in the slices below. Triage's one open question — whether slice B reaches
`src/server.ts` by child process or by a `src/` config extraction — was ruled on at gate 3:
child process, with flakiness to be treated as a verdict rather than patched. See
`docs/factory/specs/FQ-3/03-design.md`.

**What changed since the spec snapshot:** an implementation run attempted FQ-5 in full on
`claude/fq-5` and gates came back green, but the finished diff measured ~515 changed lines
(~404 excluding blank/comment-only lines) against the charter's 400-line `STOP_IF` ceiling —
over on both measures. That run stopped without opening a PR, per its own issue's
pre-written instruction ("if the harness pushes past it, stop and split rather than trimming
the test"), and left a superseding handoff on #5 moving it back to `ready-to-spec`. This
triage run independently re-derived the same disposition from Charter §7 and confirms the
label already matches. FQ-5 is **not currently claimable** — see below.

## Blocked on a named dependency

## FQ-5: integration slice 0 — harness and the tracer round trip
- disposition: ready-to-spec (moved back from ready-to-implement — see above)
- source: https://github.com/RoscoeLotriet/purview/issues/5
- parent: #3 · spec: `docs/factory/specs/FQ-3/`
- last_triaged: 2026-08-29 (this run, re-derived independently; label already correct)
- done_when: slice 0 is re-cut into pieces that each fit under the charter's 400-line
  ceiling, and the charter's position on whether `tests/integration/harness/*.ts` counts as
  an "existing test file" once created (Charter §3) is decided for slices #6–#9
- files_expected: docs/factory/specs/FQ-3/04-slices.md
- load_bearing: false
- gate_level: full
- confidence: high
- notes: proposed split is 0a (~180 lines: project wiring, `/healthz`, tool listing) and 0b
  (~340 lines: fake Slack, signing, the tracer round trip). Evidence branch `claude/fq-5` and
  full record `docs/factory/runs/2026-08-29T003039Z-implement-5.md` exist but are unmerged;
  treat as measurement, not a proposal to build on directly. Still blocks #6–#9.

## FQ-6: integration slice 1 — round-trip edge cases
- disposition: wait-to-implement · **blocked on #5**
- source: https://github.com/RoscoeLotriet/purview/issues/6
- gate_level: full · confidence: high
- done_when: tests 2–5 pass; test 3 proves non-release via `stillPending`, not a status code
- notes: promote when #5 merges

## FQ-7: integration slice 2 — bootstrap and configuration
- disposition: wait-to-implement · **blocked on #5**
- source: https://github.com/RoscoeLotriet/purview/issues/7
- gate_level: full · confidence: medium
- done_when: tests 6–11 pass against the real entrypoint spawned as a child process; test 8 characterizes the unsigned-interaction endpoint
- notes: flakiest slice. Retries or sleeps beyond one `EADDRINUSE` retry mean the entrypoint is not testable as written — file the `src/` config-extraction issue instead. Blocks #10.

## FQ-8: integration slice 3 — Slack delivery and failure modes
- disposition: wait-to-implement · **blocked on #5**
- source: https://github.com/RoscoeLotriet/purview/issues/8
- gate_level: full · confidence: high
- done_when: tests 12–17 pass; test 15 scoped to the escalation record's fields and commented as the placeholder for #12
- notes: test 15 is #12's acceptance test in its pre-fix form

## FQ-9: integration slice 4 — resources and concurrent agents
- disposition: wait-to-implement · **blocked on #5**
- source: https://github.com/RoscoeLotriet/purview/issues/9
- gate_level: full · confidence: high
- done_when: tests 18–24 pass; test 19 fails if the bare `workitem://{id}` template is registered before the more specific ones
- notes: held to wave 3 only for the review cap; no technical dependency beyond #5, so promote early if a wave-2 item is rejected

## FQ-10: integration slice 5 — restart boundary tripwire
- disposition: wait-to-implement · **blocked on #7**
- source: https://github.com/RoscoeLotriet/purview/issues/10
- gate_level: full · confidence: high
- done_when: test 25 passes and is commented as a tripwire a durable store must deliberately flip
- notes: deliberately near-tautological; first test to cut if the suite runs long

## FQ-3: integration suite covering the step-1 seams (parent)
- disposition: wait-to-implement · **blocked on its own slices**
- source: https://github.com/RoscoeLotriet/purview/issues/3
- last_triaged: 2026-08-28 (`factory-triage`, #4) · specced: 2026-08-29
- notes: triaged `ready-to-spec`, then specced through all four gates. No longer directly implementable — the work lives in #5–#10.

---

## Needs a human spec run

## FQ-11: run the factory gates automatically on every push
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/11
- last_triaged: 2026-08-29 (`factory-triage`, this run — first handoff comment; none existed before)
- done_when: a spec decides gate level per path, whether the check is required for merge, whether the integration suite runs in CI, and runner/Node version
- files_expected: docs/factory/specs/FQ-11/**
- load_bearing: **true** — the workflow directory is a Charter §2 path, forcing `deep` gates and a human read
- gate_level: deep
- confidence: medium
- notes: surfaced by FQ-3 gate 2. Nothing runs the gates automatically today; the gates script only runs when someone remembers. Open decisions: gate level per path, required status check or not, whether the integration suite runs in CI at all.

## FQ-12: record Slack delivery outcome so a dropped escalation is observable
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/12
- last_triaged: 2026-08-29 (`factory-triage`, this run — first handoff comment; none existed before)
- done_when: a spec decides what delivery outcome is recorded, who/how it surfaces, and whether failure should change escalation behaviour; FQ-3 slice 3's test 15 (#8) is then inverted from placeholder to acceptance test
- files_expected: docs/factory/specs/FQ-12/**
- load_bearing: false
- gate_level: full
- confidence: medium
- notes: surfaced by FQ-3 gate 3. `src/service/purview.ts:727-736` swallows every bridge failure, so a misconfigured webhook and a failed product premise produce the same dashboard — the confound that undermines the step-1 readout. Open decisions include whether delivery failure should change behaviour, not just be observable; today a timeout fires as if a human saw the card and ignored it.

---

## Wave plan for FQ-3

Charter §7 halts the factory above 3 items awaiting human review, so this is a constraint:

| Wave | Slices | Review load |
|---|---|---|
| 1 | #5 (re-cut into 0a/0b — see FQ-5 above; not yet claimable as scoped) | 1 PR — everything depends on it |
| 2 | #6, #7, #8 | 3 PRs — at the cap |
| 3 | #9, #10 | 2 PRs |
