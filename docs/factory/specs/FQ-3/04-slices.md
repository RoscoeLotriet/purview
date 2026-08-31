# FQ-3 · Gate 4 — Slices

**Revision 3, 2026-08-31.** Splits slice 4 into 4a and 4b, on measurement rather than on
estimate: the slice was written in full, came back green, and measured 488 lines. Only the
slice-4 section, the estimates table and the wave plan change; every other slice stands as
revision 2 approved it.

**Revision 2, 2026-08-30.** Superseded the plan approved 2026-08-29, which cut slice 0 as a
single unit. Revision 1 is in git history at `bbeb7d5`; it is superseded, not deleted, because
the reason it was wrong is the most useful thing in this document.

Gate 3 amendment 1 approved 2026-08-30: the harness takes an injected `SlackFake` rather than
starting one, and `tap()` is a free function in its own module.

## Why revision 3 exists, in one number

Revision 2 estimated slice 4 at ~250 lines and the status file warned it was "likely to need a
split", asking for the seam to be agreed before a run claimed it. That warning was not acted on,
so implementation run `2026-08-31T132508Z-implement-9` claimed the slice whole and hit the
ceiling with the work already written.

**It measured 488 lines against a 400 ceiling — 95% over estimate, the worst variance in this
spec.** The run stopped rather than trimming, exactly as the standing instruction says.

Nothing about the work is in question. All seven tests pass, no file was modified, nothing under
`src/` was touched, and gates were green at `full`:

```
FACTORY_GATES: level=full status=GREEN passed=4 failed=0 failing=none skipped=none misconfigured=none
```

The work is parked on `claude/fq-9` at `547a4ac`, which is **evidence, not a shippable diff**.
It must not become a pull request as it stands — it is over the ceiling by construction. Both
slices below are clean cherry-picks from it, so this split costs a rebase, not a rewrite.

The lesson is narrower than revision 2's and worth stating plainly: **a named split point is
only useful if a run is required to read it before claiming.** Slice 2 split cleanly at a
pre-agreed seam with no spec run; slice 3 and now slice 4 both stopped a run and needed a human.
The difference each time was whether the seam had been written into the issue's handoff comment,
not whether it had been written down somewhere.

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

Charter §3 forbids an unattended run modifying an existing file matching `TESTS_PROTECTED`,
which covers `tests/**` — harness helpers included — and `vitest.config.ts`. Triage filed
that scope as an open question on PR #15; it was decided on 2026-08-30 in favour of the broad
reading (`docs/factory/DECISIONS.md`). The gate 3 amendment had already resolved it by design
for this spec, so no waiver is needed here either way.

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
  socket; `startHarness` matches the amended contract, taking an injected Slack fake and
  constructing no `SlackBridge` when none is given; no file under `src/` and no pre-existing
  test file modified.

  **Corrected 2026-08-30.** This clause previously read "imports `SlackFake` as a type only",
  which is unsatisfiable: a type-only import still requires the module to resolve, and
  `slack-fake.ts` does not land until slice 0b, so it yields `TS2307`. Confirmed by two
  independent verifier contexts compiling a probe. The harness declares a structural
  `SlackTarget { readonly webhookUrl: string }` instead, which 0b's `SlackFake` satisfies by
  shape — reaching the clause's stated goal, no dependency on `slack-fake.ts`, more completely
  than an `import type` could. See `03-design-amendment-1.md`.
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

### Slice 4 — split into 4a and 4b at revision 3 · issue #9 retired

The split runs along the file boundary, which is also the test-group boundary. **No test moves
and no test is trimmed**; each file goes to its own slice exactly as written and measured.

Both are cherry-picks from `claude/fq-9` at `547a4ac`. Neither depends on the other, so they
may run in either order or in parallel if review capacity allows.

### Slice 4a — Resources · `ready-to-implement` · issue #38

The four MCP resources over the real transport, which no test reaches today. They are
registered at `src/mcp/server.ts:269,287,309,321` with `{ list: undefined }`, so
`resources/list` will not enumerate them — every read is by URI.

- **Tests:** 18–20, including **test 19**, the template-ordering invariant
- **New file:** `tests/integration/resources.integration.test.ts`
- **done_when:** tests 18–20 pass; test 19 fails if the bare `workitem://{id}` template is
  registered before the more specific ones; no file under `src/` is modified; gates report
  `FACTORY_GATES status=GREEN` at `full`.
- **208** **measured** · **gate_level:** full · **confidence:** high
- **Depends on:** slice 0a's harness only. Nothing else.

**Test 19's invariant is weaker than revision 2 assumed, and the slice carries the correction.**
Revision 2 called test 19 "the valuable one" on the premise that reordering the registrations
would let the bare `workitem://{id}` template swallow `workitem://{id}/tree`. The implement run
reordered them by hand and re-ran: **it does not.** With the SDK version in this lockfile `{id}`
does not match across a `/`, so the tree URI resolves correctly however the registrations are
ordered. The comment in `src/mcp/server.ts` is defensive, not load-bearing today.

The `done_when` clause survives intact because the test reaches it by another route:
`resources/templates/list` enumerates templates in registration order, so asserting the bare
template is listed last is that code comment made executable, and it was verified to fail on a
hand-reorder (`AssertionError: expected 0 to be greater than 1`). The test asserts both halves
and says in a comment which is which, so no later reader cites it as proof of more than it
shows. **An implementation that drops either half has not met the clause.**

### Slice 4b — Concurrent agents · `ready-to-implement` · issue #39

`src/http/app.ts:29-35` builds a **new** protocol server per POST against **one** shared
`PurviewService`. That is the normal deployment condition and nothing tests it.

- **Tests:** 21–24
- **New file:** `tests/integration/concurrent-agents.integration.test.ts`
- **done_when:** tests 21–24 pass; the file carries the gate-2 scope note that these prove
  `await`-interleaving safety only, not thread safety and not multi-process safety; no file
  under `src/` is modified; gates report `FACTORY_GATES status=GREEN` at `full`.
- **280** **measured** · **gate_level:** full · **confidence:** high
- **Depends on:** slice 0a's harness, plus slice 0b's `tap` for test 24. Both have merged.

The scope note is a `done_when` clause and not a nicety. Node is single-threaded; without it a
future reader cites these tests as proof of thread safety or multi-process safety, which they do
not show and cannot show while v0 has no shared store to contend over.

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

**Four slices in, every measurement has come in over, and the spread is widening.** Revision 3
adds the fourth and worst point:

| Slice | Estimated | Measured | Variance |
|---|---|---|---|
| 0 (before the split) | ~330 | 515 | +56% |
| 2 (before the split) | ~280 | 490 | +75% |
| 3a alone (4 of slice 3's 6 tests) | ~220 for all six | 264 | +20% for two-thirds of the scope |
| 4 (before the split) | ~250 | 488 | **+95%** |

Slice 4 was estimated at ~36 lines per test and landed at ~70. On that rate nothing above five
tests fits under the ceiling in one slice, and the two remaining unwritten slices should be read
against ~70 per test rather than against their revision-1 estimates.

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

**Added at revision 3: a split point that lives only in this file does not reach the run that
needs it.** Slice 4's status entry said it was likely to need a split and asked for the seam to
be agreed in advance; the implement run read the issue's `factory-handoff:v1` comment, which is
what the contract makes authoritative, and that comment said nothing about a seam. So a named
seam must be written **into the issue's handoff comment**, not only here. Where a slice is
suspected of exceeding the ceiling, its handoff carries the seam and the instruction to split at
it without a spec run — the mechanism that made slice 2 cheap and its absence what made slices 3
and 4 expensive.

## Wave plan

Charter §7 stops the factory when more than 3 items are awaiting human review, so sequencing
is a constraint, not a suggestion. Revision 1 had three waves; the 0a/0b split adds one.

| Wave | Slices | Review load |
|---|---|---|
| 1 | 0a | 1 PR — everything depends on it, nothing runs beside it |
| 2 | 0b | 1 PR — same reason; slices 1–4 all consume its files |
| 3 | 1, 2, 3 | 3 PRs — exactly at the charter limit |
| 4 | 4a, 4b, 5 | 3 PRs — at the limit; the split spends the slack wave 4 used to have |

Revision 3's split costs one review slot. Wave 4 was two PRs and is now three, which is exactly
the charter limit.

In practice the constraint has already relaxed: by the time revision 3's queue entries were
written, slice 5 (PR #31), 2b (PR #36) and 3b (PR #37) had all merged, so **4a and 4b are the
only slices left in FQ-3** and the review queue is empty. Two PRs against a limit of three
leaves one slot spare — the wave table describes the plan, not the live constraint.

The split also removes the promotion note revision 2 carried. Slice 4a needs only 0a and slice
4b needs 0b, both of which merged; neither is blocked on anything, and there is nothing left to
promote early.

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

**Revision 3 additions:**

- **Whether `src/mcp/server.ts`'s registration-order comment should be reworded.** It now
  describes an ordering the SDK's matcher makes unnecessary, so it is misleading rather than
  wrong. Touching it is a `src/` change for a comment, and slice 4a's test carries the
  correction where a reader will meet it. Not filed.
- **Whether the tree resource should match without both query variables.** Filed as **#40**:
  `workitem://{id}/tree{?depth,attention_only}` returns `Resource not found` unless *both*
  `depth` and `attention_only` are present, and nothing tells an agent that. Real, needs `src/`,
  outside FQ-3's scope of pinning behaviour rather than changing it.
- **How an implement run should isolate its checkout.** Filed as **#41**, off the back of this
  run: the deterministic remote-branch claim locks the branch, not the working tree, so two
  local runs in one checkout collide silently. Not an FQ-3 defect, but FQ-3's run surfaced it.

**Carried from revision 2, unchanged:**

- Whether Charter §3 covers non-`*.test.ts` helpers under `tests/`. Routed around by design so
  the suite needs no waiver. The question is still open and still worth answering, because the
  next spec that wants a shared helper will hit it again.
- Everything revision 1 declined to decide: whether the unsigned-interaction endpoint should be
  fixed, whether the ~20s integration budget is right, and any test for step 2–4 surfaces.

---

**Gate 4 revision 2 approved 2026-08-30.** Its queue entries were written and seven of its
slices have merged.

**Gate 4 revision 3 approved 2026-08-31.** Queue entries written the same day: #38 (slice 4a)
and #39 (slice 4b), both `factory:ready-to-implement`, each carrying a `factory-handoff:v1`
comment with the `done_when` above. #9 closed as split, with no queue-state label left on it —
a closed issue holding a live label is the exact disagreement that hid #28's work for a day.
