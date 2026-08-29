# FQ-3 · Gate 4 — Slices

Gate 3 approved 2026-08-29. Child-process approach accepted, with flakiness to be read as a
verdict rather than patched with retries. Test 15 kept, narrowly scoped.

## The dependency that dictates the labels

Every slice below consumes the harness built in slice 0. If all six were labelled
`factory:ready-to-implement` at once, six implementation runs would each win a different
issue's claim and each build their own incompatible harness — six PRs that cannot merge
together. The contract has the right label for this: `factory:wait-to-implement`, "understood,
but blocked on a named dependency."

So: **slice 0 is the only `ready-to-implement` item.** Everything else lands as
`wait-to-implement` with its blocker named, and gets promoted when its dependency merges.
This is the difference between a queue and a pile.

## Slices

Line counts are estimates against the charter's 400-line ceiling, not measurements.

### Slice 0 — Harness and the tracer round trip · `ready-to-implement`

The tracer bullet: one test that crosses every seam, with the deployment itself still stood
in for by an in-process `buildApp`. Nothing after this adds a new *kind* of hop.

- **Files:** `tests/integration/harness/{ports,wait,sign,slack-fake,purview}.ts`, `tests/integration/escalation-round-trip.integration.test.ts` (test 1 only), `package.json`, `vitest.config.ts`
- **done_when:** `pnpm test` runs unit and integration projects and is what the gates script invokes; `pnpm test:unit` runs unit only; one integration test drives `work_create` → `work_claim` → `work_escalate(blocking)` over a real MCP client on a real socket, reads the `action_id` off the card recorded by the fake Slack, POSTs a signed `block_actions` form to `/slack/interactions`, and asserts the held `work_escalate` promise resolves with the chosen option. No file under `src/` modified.
- **gate_level:** full · **confidence:** medium (largest slice; ~330 lines estimated, closest to the ceiling)
- **Blocks:** every other slice.

### Slice 1 — Round-trip edge cases · `wait-to-implement` (slice 0)

- **Tests:** 2 (card replaced at `response_url`), 3 (unsigned tap does not release the agent), 4 (unknown option leaves it open), 5 (timeout returns `timed_out` on real timers)
- **Files:** extends `escalation-round-trip.integration.test.ts`
- **done_when:** all four present and passing; test 3 proves non-release via `stillPending` rather than by asserting a 401; test 5 uses `timeout_seconds: 1` and real timers.
- **gate_level:** full · **confidence:** high · ~150 lines

### Slice 2 — Bootstrap and configuration · `wait-to-implement` (slice 0)

The slice that replaces the stand-in with the real thing: the deployment stops being
`buildApp` in a test and becomes the actual entrypoint, spawned.

- **Tests:** 6–11, including **test 8**, the characterization of an unsigned interaction resolving an escalation when the signing secret is unset
- **Files:** `tests/integration/harness/server-proc.ts`, `tests/integration/bootstrap-config.integration.test.ts`
- **done_when:** the real entrypoint is spawned under `tsx` with controlled env and all six tests pass; test 8 asserts and comments the open-endpoint behaviour as deliberate characterization. **Per gate 3: if these need retries or sleeps to stay green, stop and file the `src/` config-extraction issue instead.**
- **gate_level:** full · **confidence:** medium (the flakiness risk lives here) · ~280 lines
- **Blocks:** slice 5.

### Slice 3 — Slack delivery and failure modes · `wait-to-implement` (slice 0)

- **Tests:** 12–17, including **test 15**, the narrowly-scoped blind-spot placeholder
- **Files:** `tests/integration/slack-delivery.integration.test.ts`
- **done_when:** all six pass; test 15 is scoped to the escalation record's own fields and carries a comment naming the delivery-signal follow-up issue as the reason it will later be flipped.
- **gate_level:** full · **confidence:** high · ~220 lines

### Slice 4 — Resources and concurrent agents · `wait-to-implement` (slice 0)

- **Tests:** 18–20 (resources, incl. **test 19**, the template-ordering invariant), 21–24 (concurrency)
- **Files:** `tests/integration/resources.integration.test.ts`, `tests/integration/concurrent-agents.integration.test.ts`
- **done_when:** all seven pass; test 19 fails if the bare `workitem://{id}` template is registered before the more specific ones; the concurrency file carries the gate-2 scope note that these prove `await`-interleaving safety only.
- **gate_level:** full · **confidence:** high · ~250 lines

### Slice 5 — Restart boundary · `wait-to-implement` (slice 2)

- **Tests:** 25
- **Files:** `tests/integration/restart-boundary.integration.test.ts`
- **done_when:** work created before `SIGTERM` is absent after a restart on the same port, with a comment naming this as the tripwire a durable store must deliberately flip.
- **gate_level:** full · **confidence:** high · ~70 lines

**Optional simplification:** slice 5 could fold into slice 2 — same harness piece, same
reviewer context — at the cost of pushing slice 2 to roughly 350 lines against a 400-line
ceiling. Kept separate on the grounds that the ceiling exists for reviewer attention, and a
70-line tripwire is easier to judge on its own than as an appendix.

## Wave plan

Charter §7 stops the factory when more than 3 items are awaiting human review, so the
sequencing is a constraint, not a suggestion:

| Wave | Slices | Review load |
|---|---|---|
| 1 | 0 | 1 PR — everything depends on it, nothing runs beside it |
| 2 | 1, 2, 3 | 3 PRs — exactly at the charter limit |
| 3 | 4, 5 | 2 PRs |

Slice 4 is held to wave 3 only to stay under the review cap; it has no technical dependency
beyond slice 0. If a wave-2 item is rejected, slice 4 can be promoted to fill the gap.

## Follow-up issues to file alongside

Both were surfaced by this spec and neither belongs inside it:

1. **CI workflow** (gate 2). Nothing runs the gates automatically today. `.github/workflows/**` is load-bearing under Charter §2, so it needs `deep` gates and a human read. Filing as `factory:ready-to-spec`.
2. **Runtime signal for swallowed Slack deliveries** (gate 3). `src/service/purview.ts:727-738` swallows every bridge failure, leaving no trace but stderr — the structural cause of the gate-1 confound. Needs a delivery outcome on the escalation record, which is a `src/` change and a product decision about what the operator should see. Filing as `factory:ready-to-spec`. **Test 15 is its acceptance test, inverted.**

## What this spec deliberately did not decide

- Whether the unsigned-interaction endpoint should be *fixed*. Test 8 pins it; changing the default is a separate decision with its own blast radius.
- Whether the `~20s` integration budget is right. It is a target to measure against at slice 4, not a gate.
- Any test for step 2–4 surfaces. None exist.
