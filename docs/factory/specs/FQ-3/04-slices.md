# FQ-3 · Gate 4 — Slices

**Revision 2, 2026-08-30.** Supersedes the plan approved 2026-08-29, which cut slice 0 as a
single unit. Revision 1 is in git history at `bbeb7d5`; it is superseded, not deleted, because
the reason it was wrong is the most useful thing in this document.

Gate 3 amendment 1 approved 2026-08-30: the harness takes an injected `SlackFake` rather than
starting one, and `tap()` is a free function in its own module.

## Why revision 1 was wrong, in numbers

Slice 0 was approved at "~330 lines estimated, closest to the ceiling". Implementation run
`2026-08-29T003039Z-implement-5` built it, gates came back GREEN on the first run, and the
diff measured **515 lines** — 56% over the estimate and 29% over the charter ceiling. The work
was correct. The sizing was not.

Measured, from `archive/fq-5-slice0-original`:

| File | Lines |
|---|---|
| `harness/slack-fake.ts` | 141 |
| `harness/purview.ts` | 108 |
| `escalation-round-trip.integration.test.ts` | 96 |
| `harness/sign.ts` | 67 |
| `harness/wait.ts` | 52 |
| `vitest.config.ts` | 26 |
| `harness/ports.ts` | 23 |
| `package.json` | 2 |
| **Total** | **515** |

Two lessons, both applied below:

1. **The harness was 391 lines on its own.** With config that is 419 — over the ceiling before
   a single test exists. "Harness in one slice, tests in the next" was never available. The
   split had to run through the harness, which is what the gate 3 amendment enables.
2. **Every estimate in revision 1 was made the same way, by the same method, on the same day.**
   One of them is now measured at +56%. The others have not been corrected downward because
   there is no evidence they were optimistic in the same proportion — but they are now treated
   as suspect rather than as budget. See "Estimates are not budget" below.

## The rule that shapes every slice: slices add files, they never modify them

Charter §3 forbids an unattended run modifying an existing test file. Triage filed the open
question of whether that covers non-`*.test.ts` helpers under `tests/` (PR #15); the gate 3
amendment resolves it by design so no waiver is needed.

**Every slice below creates new files only.** No slice modifies a file another slice created.

This also fixes a defect in revision 1 that had nothing to do with line counts: slice 1 was
specified as "extends `escalation-round-trip.integration.test.ts`". That is a `*.test.ts`
file, caught by §3 under any reading, so slice 1 as approved could not have run unattended.
It now gets its own file.

`package.json` and `vitest.config.ts` are modified once, in slice 0a, and never again.

## Slices

Line figures are marked **measured** (the file exists and passes on `archive/fq-5-slice0-original`) or
*estimated*. Estimates in this document have a known failure mode; see the note after the
table.

### Slice 0a — Harness core and the MCP tracer · `ready-to-implement` · issue #5

The tracer bullet through the MCP seam. Real socket, real client, real transport, no Slack.

- **New files:** `tests/integration/harness/{ports,wait,purview}.ts`,
  `tests/integration/mcp-round-trip.integration.test.ts`
- **Modified:** `package.json` (scripts), `vitest.config.ts` (projects)
- **Reuse:** `ports.ts` (23, measured), `wait.ts` (52, measured), `vitest.config.ts` (26,
  measured) and `package.json` (2, measured) land unchanged from `archive/fq-5-slice0-original`.
  `purview.ts` lands amended per gate 3 amendment 1 (~100, from 108 measured).
- **New test** (~50, *estimated*): one test driving `work_create` → `work_claim` →
  `work_escalate({ blocking: false })` over a real MCP `Client` on
  `StreamableHTTPClientTransport` with `requestInit.headers['x-purview-principal']`, then
  reading the escalation back. Log-only deployment: no `slack` injected, so no `SlackBridge`
  is constructed — the configuration test 9 declares supported.
- **done_when:** `pnpm test` runs both the `unit` and `integration` projects and is what the
  gates script invokes; `pnpm test:unit` runs unit only; the round-trip test passes on a real
  socket; `startHarness` matches the amended contract and imports `SlackFake` as a type only;
  no file under `src/` and no pre-existing test file modified.
- **Total: ~253** · **gate_level:** full · **confidence:** high (203 of it measured)
- **Blocks:** every other slice.

### Slice 0b — Slack fake, signing, and the full round trip · `wait-to-implement` (0a) · new issue

The Slack seam, and the tracer bullet completed. This is revision 1's test 1, intact.

- **New files:** `tests/integration/harness/{sign,slack-fake,tap}.ts`,
  `tests/integration/escalation-round-trip.integration.test.ts`
- **Reuse:** `sign.ts` (67, measured), `slack-fake.ts` (141, measured) and the round-trip test
  (96, measured) land unchanged from `archive/fq-5-slice0-original`. `tap.ts` is new (~25, *estimated*),
  carrying the logic lifted out of `PurviewHarness.tap`.
- **done_when:** the test injects a `SlackFake` into `startHarness`, drives `work_create` →
  `work_claim` → `work_escalate({ blocking: true })` and **holds the promise**; reads the
  `action_id` (`resolve:<escalation_id>:<option_id>`) off the card recorded by the fake — from
  the card, not the tool result; form-encodes a `block_actions` payload, signs it v0, POSTs to
  `/slack/interactions` via `tap()`; asserts the held promise resolves with the chosen option.
  **No assertion on that POST's response** — `/slack/interactions` acks at
  `src/http/app.ts:89` before doing any work. The test closes the fake it started.
- **Total: ~329** · **gate_level:** full · **confidence:** high (304 of it measured)
- **Blocks:** slices 1, 2, 3, 4.

### Slice 1 — Round-trip edge cases · `wait-to-implement` (0b)· issue #6

- **Tests:** 2 (card replaced at `response_url`), 3 (unsigned tap does not release the agent),
  4 (unknown option leaves it open), 5 (timeout returns `timed_out` on real timers)
- **New file:** `tests/integration/escalation-edge-cases.integration.test.ts`. **Changed from
  revision 1**, which extended slice 0b's test file and would have violated Charter §3.
- **done_when:** all four present and passing; test 3 proves non-release via `stillPending`
  rather than by asserting a 401; test 5 uses `timeout_seconds: 1` and real timers.
- **~180** *estimated* (revision 1 said ~150 as an extension; a standalone file carries its own
  imports and setup) · **gate_level:** full · **confidence:** high

### Slice 2 — Bootstrap and configuration · `wait-to-implement` (0b) · issue #7

Replaces the stand-in with the real thing: the deployment stops being `buildApp` in a test and
becomes the actual entrypoint, spawned.

- **Tests:** 6–11, including **test 8**, the characterization of an unsigned interaction
  resolving an escalation when the signing secret is unset
- **New files:** `tests/integration/harness/server-proc.ts`,
  `tests/integration/bootstrap-config.integration.test.ts`
- **done_when:** the real entrypoint is spawned under `tsx` with controlled env and all six
  tests pass; test 8 asserts and comments the open-endpoint behaviour as deliberate
  characterization. **Per gate 3: if these need retries or sleeps beyond a single `EADDRINUSE`
  retry to stay green, that is a verdict that the entrypoint is not testable as written —
  stop and file the `src/` config-extraction issue rather than adding a retry.**
- **~280** *estimated* · **gate_level:** full · **confidence:** medium
- **⚠ Most likely slice to overflow.** It is the largest estimate in the document and it is an
  estimate made by the method that missed by 56%. **Pre-agreed split point, so no new spec run
  is needed if it overflows:** land `server-proc.ts` with tests 6, 9 and 11 (the process
  lifecycle: serves three surfaces, starts without a webhook, `SIGTERM` closes the listener) as
  slice 2a; tests 7, 8 and 10 (signing-secret and principal configuration) as slice 2b in a
  second new file. Take the split at the 400-line mark; do not trim tests to fit.
- **Blocks:** slice 5.

### Slice 3 — Slack delivery and failure modes · `wait-to-implement` (0b) · issue #8

- **Tests:** 12–17, including **test 15**, the narrowly-scoped blind-spot placeholder
- **New file:** `tests/integration/slack-delivery.integration.test.ts`
- **done_when:** all six pass; test 15 is scoped to the escalation record's own fields and
  carries a comment naming issue #12 as the reason it will later be inverted.
- **~220** *estimated* · **gate_level:** full · **confidence:** high

### Slice 4 — Resources and concurrent agents · `wait-to-implement` (0b) · issue #9

- **Tests:** 18–20 (resources, incl. **test 19**, the template-ordering invariant), 21–24
  (concurrency)
- **New files:** `tests/integration/resources.integration.test.ts`,
  `tests/integration/concurrent-agents.integration.test.ts`
- **done_when:** all seven pass; test 19 fails if the bare `workitem://{id}` template is
  registered before the more specific ones; the concurrency file carries the gate-2 scope note
  that these prove `await`-interleaving safety only.
- **~250** *estimated* · **gate_level:** full · **confidence:** high
- **Note:** tests 18–23 need only slice 0a. Only test 24 (two agents' blocking escalations
  resolve independently) needs the tap from 0b. If review capacity is the binding constraint
  and 0b is still open, this slice can be promoted early with test 24 deferred.

### Slice 5 — Restart boundary · `wait-to-implement` (slice 2) · issue #10

- **Tests:** 25
- **New file:** `tests/integration/restart-boundary.integration.test.ts`
- **done_when:** work created before `SIGTERM` is absent after a restart on the same port, with
  a comment naming this as the tripwire a durable store must deliberately flip.
- **~70** *estimated* · **gate_level:** full · **confidence:** high

## Estimates are not budget

Revision 1's one measured estimate came in 56% high. Applying that factor to what is left:
slice 2 would land at ~437 and slices 3 and 4 in the high 300s. That is not a prediction —
one data point is not a correction factor — but it is enough that these estimates must not be
treated as headroom.

**Standing instruction for every slice below 0a and 0b.** Measure before opening the PR, with
the command Charter §7 now specifies:

```bash
git diff --numstat origin/main...HEAD -- . ':!docs/**' ':!*.md' \
  | awk '{ a += $1; r += $2 } END { print a + r }'
```

If the count exceeds 400, **stop and split. Do not trim tests to fit.** The ceiling exists to
bound reviewer attention; a slice that fits only because its coverage was cut has moved the
cost rather than paid it. Slice 2 has its split point pre-agreed above. For any other slice,
stopping and asking is correct and expected — that is the stop condition working, not a run
failing.

## Wave plan

Charter §7 stops the factory when more than 3 items are awaiting human review, so sequencing
is a constraint, not a suggestion. Revision 1 had three waves; the 0a/0b split adds one.

| Wave | Slices | Review load |
|---|---|---|
| 1 | 0a | 1 PR — everything depends on it, nothing runs beside it |
| 2 | 0b | 1 PR — same reason; slices 1–4 all consume its files |
| 3 | 1, 2, 3 | 3 PRs — exactly at the charter limit |
| 4 | 4, 5 | 2 PRs |

If a wave-3 item is rejected, slice 4 can be promoted to fill the gap (see its note — most of
it needs only 0a).

## What happens to `archive/fq-5-slice0-original`

It stays. It is green, it is correct, and 507 of its 515 lines are reused verbatim or nearly
so across 0a and 0b. It is a source branch to cherry-pick from, not work to redo. **It must
not be merged** — it is the 515-line diff the ceiling stopped, and merging it would land both
slices as the single unreviewable unit this revision exists to avoid.

Close it once 0b merges.

## Follow-ups, unchanged from revision 1

- **#11** — CI workflow. Nothing runs the gates automatically today; `.github/workflows/**` is
  load-bearing under Charter §2, so it needs `deep` gates and a human read. `ready-to-spec`.
- **#12** — runtime signal for swallowed Slack deliveries. `src/service/purview.ts:727-736`
  swallows every bridge failure. `ready-to-spec`. **Test 15 is its acceptance test, inverted.**

## What this revision deliberately did not decide

- Whether Charter §3 covers non-`*.test.ts` helpers under `tests/`. Routed around by design so
  the suite needs no waiver. The question is still open and still worth answering, because the
  next spec that wants a shared helper will hit it again.
- Everything revision 1 declined to decide: whether the unsigned-interaction endpoint should be
  fixed, whether the ~20s integration budget is right, and any test for step 2–4 surfaces.

---

**STOP — gate 4 awaiting approval.** No GitHub issue, label, handoff comment or `QUEUE.md`
entry is written until this is approved.
