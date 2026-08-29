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

_Snapshot written by `factory-spec` on 2026-08-29, superseding the `factory-triage` snapshot
of 2026-08-28 (#4). Live labels are the source of truth._

Triage's FQ-3 entry (`ready-to-spec`) is not lost, it is **completed**: that run independently
re-derived `ready-to-spec` from the charter, the spec then ran, and FQ-3 is now a parent whose
work lives in the slices below. Triage's one open question — whether slice B reaches
`src/server.ts` by child process or by a `src/` config extraction — was ruled on at gate 3:
child process, with flakiness to be treated as a verdict rather than patched. See
`docs/factory/specs/FQ-3/03-design.md`.

## Claimable now

## FQ-5: integration slice 0 — harness and the tracer round trip
- disposition: ready-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/5
- parent: #3 · spec: `docs/factory/specs/FQ-3/`
- files_expected: tests/integration/harness/{ports,wait,sign,slack-fake,purview}.ts, tests/integration/escalation-round-trip.integration.test.ts, package.json, vitest.config.ts
- load_bearing: false
- gate_level: full
- done_when: `pnpm test` runs both vitest projects and is what the gates script invokes; `pnpm test:unit` runs unit only; one integration test drives create → claim → escalate(blocking) over a real MCP client, reads the `action_id` off the card recorded by the fake Slack, POSTs a signed `block_actions` form, and asserts the held promise resolves with the chosen option
- confidence: medium
- notes: ~330 estimated lines against a 400 ceiling — the tightest slice. Blocks #6–#9. `pnpm test` must run integration too: the gates script invokes exactly `pnpm test` and there is no CI, so a separate script would gate nothing.

---

## Blocked on a named dependency

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
- load_bearing: **true** — the workflow directory is a Charter §2 path, forcing `deep` gates and a human read
- notes: surfaced by FQ-3 gate 2. Nothing runs the gates automatically today; the gates script only runs when someone remembers. Open decisions: gate level per path, required status check or not, whether the integration suite runs in CI at all.

## FQ-12: record Slack delivery outcome so a dropped escalation is observable
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/12
- load_bearing: false
- notes: surfaced by FQ-3 gate 3. `src/service/purview.ts:727-738` swallows every bridge failure, so a misconfigured webhook and a failed product premise produce the same dashboard — the confound that undermines the step-1 readout. Open decisions include whether delivery failure should change behaviour, not just be observable; today a timeout fires as if a human saw the card and ignored it.

---

## Wave plan for FQ-3

Charter §7 halts the factory above 3 items awaiting human review, so this is a constraint:

| Wave | Slices | Review load |
|---|---|---|
| 1 | #5 | 1 PR — everything depends on it |
| 2 | #6, #7, #8 | 3 PRs — at the cap |
| 3 | #9, #10 | 2 PRs |
