```
item: FQ-3
source: https://github.com/RoscoeLotriet/purview/issues/3
gate_1_product: approved 2026-08-29 (all six gaps; step 1 survives the readout)
gate_2_architecture: approved 2026-08-29 (pnpm test runs both suites; CI filed separately)
gate_3_design: approved 2026-08-29 (child process accepted; test 15 kept, narrowly scoped)
gate_3_amendment_1: approved 2026-08-30 (injected SlackFake; tap() becomes a free function)
gate_4_slices: approved 2026-08-31, revision 3 (slice 4 split on measurement; queue written)
slices_completed: 10 / 10
tests_landed: 26 / 26
status: complete — every slice merged; #3 itself awaits a human's close
status_as_of: 2026-08-31T14:45Z
open_questions:
  - none. The last two slices (#38, #39) merged as PR #43 and PR #44.
  - the stale factory:awaiting-review labels this file flagged are cleared. All ten closed
    slice issues (#5, #6, #7, #8, #10, #18, #26, #28, #38, #39) were verified merged first,
    then had the label removed on 2026-08-31.
  - not blocking, carried for a later reader: making a principal's display_name observable
    on a wire surface would be a src/ change and a product decision. FQ-3 does not need it —
    test 10 reaches the same claim by another route — and no issue is filed for it.
```

**FQ-3 is done as specified.** Treat the table below as the record of what landed and
`04-slices.md` as the plan that was approved. They differ by the three splits taken during
implementation, each recorded on its issue and explained further down.

## Slices

Ten, not the seven approved at gate 4. Slices 2 and 3 each split during implementation and
slice 4 split at gate 4 revision 3; all three splits are recorded on their issues. Test
numbering follows `03-design.md`; slice 0a's tracer is unnumbered, which is why the denominator
is 26 and not 25.

| Issue | Slice | Tests | State | Evidence |
|---|---|---|---|---|
| #5 | 0a — harness core and the MCP tracer | tracer | **merged** | PR #21 · `cbba004` |
| #18 | 0b — Slack fake, signing, full round trip | 1 | **merged** | PR #24 · `0e43740` |
| #6 | 1 — round-trip edge cases | 2–5 | **merged** | PR #25 · `5344776` |
| #7 | 2a — the entrypoint spawned as a process | 6, 9, 11 | **merged** | PR #27 · `79f4c53` |
| #26 | 2b — signing secret and principal config | 7, 8, 10 | **merged** | PR #36 · `d29c05a` |
| #8 | 3a — Slack delivery over a real socket | 12–15 | **merged** | PR #29 · `9bbdabb` |
| #28 | 3b — digest delivery | 16, 17 | **merged** | PR #37 · `759364e` |
| #9 | 4 — **split into 4a + 4b** | 18–24 | closed as split | gate 4 rev 3, 2026-08-31 |
| #38 | 4a — resources | 18–20 | **merged** | PR #43 · `f93b328` |
| #39 | 4b — concurrent agents | 21–24 | **merged** | PR #44 · `d2c88e2` |
| #10 | 5 — restart boundary tripwire | 25 | **merged** | PR #31 · `4636cc8` |

**All twenty-six integration tests are on `main`, in ten files, all green at `full` gates.**
Nothing is parked. Tests 18–24 landed as PR #43 and PR #44, cherry-picked from `claude/fq-9`
at `547a4ac` along the file boundary the 4a/4b split ran on, so no test moved and none was
trimmed; the verifier confirmed both files byte-identical to the parked blobs.

## Done, verified against #3's own clauses

Checked on `d2c88e2` rather than inferred from the slices being merged. #3 asked for four
things:

| Clause from #3 | Evidence |
|---|---|
| `tests/integration/` exists and every gap 1–6 has a test that fails if its wiring breaks | 10 files, 26 tests; gap→slice map below, each with a negative proof in its run record |
| integration invocable separately from the unit suite, both green | `--project integration` → 26 passed; `pnpm test:unit` → 86 passed |
| `gates.sh` GREEN at the required level | `FACTORY_GATES: level=full status=GREEN passed=4 failed=0 failing=none skipped=none misconfigured=none` — 112 tests, 22 files, none skipped |
| no file under `src/` and no pre-existing test file modified | `git log a379055..main -- src/` is **empty**: not one commit across ten slices touched `src/` |

That last line is the one worth keeping. The suite's defining constraint was that it must
cover existing behaviour without changing any of it, and the whole of `src/` is untouched
from PR #1's merge to now. Two `src/` defects were found along the way (#12, #40) and both
were filed rather than fixed in place.

Gap coverage, from #3's own numbering:

| Gap | Closed by |
|---|---|
| 1 — nothing crosses all three seams in one scenario | #5, #18, #6 |
| 2 — `src/server.ts` has zero coverage | #7, #26 |
| 3 — `SlackBridge.send()` never talks to a server | #8, #28 |
| 4 — the four MCP resources never read over the real transport | #38 |
| 5 — multi-agent concurrency untested at the transport | #39 |
| 6 — the documented restart behaviour has no test pinning it | #10 |

**#3 itself is still open and a human owns closing it.** Its label is
`factory:wait-to-implement`, which should come off in the same action; a closed issue holding
a live queue label is the disagreement described below.

## Queue labels on the closed slices, cleared 2026-08-31

All ten closed slice issues were still carrying `factory:awaiting-review` after their pull
requests merged. Each was checked against its merged PR before the label came off, because the
failure mode this file records twice is a label and a state disagreeing while real work sits
invisible — the check is what distinguishes stale bookkeeping from a parked slice.

Cleared: #5, #6, #7, #8, #10, #18, #26, #28, #38, #39. #9 already carried none.

This is housekeeping against a live defect, not a fix for it. Nothing stops the next merged
slice from leaving its label behind; #33 is where the mechanism gets addressed.

**One observation for #33, mechanism not established.** #39 closed as `completed` at
14:32:24Z, the same moment PR #44 merged, and PR #44's body contains no closing keyword. Its
implementation commit carries the trailer `Closes-queue-item: #39`. Either the human closed
the issue by hand at merge, or GitHub parsed that trailer as a closing keyword — in which case
the surface #33 describes is wider than PR bodies and includes commit trailers, which are just
as immutable once merged. Worth settling from the timeline before #33 is specced, since it
changes what the rule has to cover. The close itself was correct either way: the item was done.

## Two slices left the queue without landing

Both were closed as *completed* while their tests did not exist. Both were reopened, and
**both have since landed** — #26 as PR #36 and #28 as PR #37. The history stays because the
mechanism that lost them is still live; #33 tracks the fix.

**#28 (slice 3b) — accidental, reopened 2026-08-31.** PR #29's body contained the sentence
"If you prefer that fork, close #28 and …" — a conditional describing an option. GitHub read
the bare `close #28` as a closing keyword and closed the issue on merge. The issue kept
`factory:ready-to-implement` throughout, so label and state disagreed and the work was
invisible rather than parked. Reopened with the history recorded on the issue.

**#26 (slice 2b) — mechanism unconfirmed, reopened 2026-08-31.** Closed 2026-08-30T22:55Z as
completed, linked to PR #27. PR #27 delivered tests 6, 9 and 11 only; its own run record and PR
body both end with "Tests 7, 8 and 10, deliberately, to #26." `SLACK_SIGNING_SECRET` appears in
no integration test that exercises it as configuration. Unlike #28 there is **no** closing
keyword in PR #27's body, so the mechanism here is not established and the close may have been
deliberate — but nothing recorded a reason, so it was reopened rather than left as a silent
drop. Its label had also gone stale — `factory:wait-to-implement` against a blocker that merged —
and was promoted to `factory:ready-to-implement` in the same session, by the human rather than by
a triage run.

What was at stake in that close is **test 8**, which `04-slices.md` calls the sharpest test
in FQ-3: `src/http/app.ts` skips signature verification entirely when no signing secret is
configured, so a deployment that forgets it exposes an endpoint where anyone who can reach the
port may answer questions addressed to the accountable human — and the transcript attributes
those answers to that human. The test does not fix that. It pins it as an explicit fact so the
behaviour cannot be discovered by accident later. Dropping it drops the record, not the risk.

**#26 has since merged as PR #36 (`d29c05a`), landing tests 7, 8 and 10.** It was promoted to
`ready-to-implement` on 2026-08-31, its blocker (#7) having merged as
`79f4c53`. Nothing about it is outstanding for a human. The slice-2 split point stands as agreed
at gate 4, and the one finding PR #27 raised against it — that a name-lookup assertion for test
10 cannot fail against the bug it exists to catch, because `src/http/app.ts` falls back to
`service.defaultHuman` on an unmatched `user_name` — was written into the issue body at the time,
together with the two-link chain that reaches the same claim without a `src/` change: the
entrypoint's startup line reports the configured name, and the escalation's `routed_to_id` equals
its `resolved_by_id` after a tap by that name. That is a trap named and routed around in advance,
not an open question.

**The general defect is #33.** PR bodies in this repo routinely discuss issue numbers in prose,
so any sentence containing close/fixes/resolves followed by an issue number will silently close
that issue on merge. #33 asks for a rule in the routines' PR-body step rather than a fix to the
two PRs, whose bodies are immutable history.

## Resolved since the last update

- **Charter §3's scope** — the open question this file carried ("does the rule cover
  non-`*.test.ts` helpers under `tests/`?") was decided on 2026-08-30 and recorded in
  `docs/factory/DECISIONS.md`: **test protection is by path**, and it covers harness helpers
  and the runner config. FQ-3 needed no waiver either way, because slices add files rather than
  modify them. #23 tracks enforcing it in `gates.sh` mechanically rather than in prose.
- **How slice 3b reaches a flushed digest** — decided 2026-08-31, recorded on #28.
  `PurviewService.flushDigest` has no wire trigger: no MCP tool, no HTTP route, and
  `startHarness` does not expose the service it builds. The two options were to spawn the real
  entrypoint with `DIGEST_INTERVAL_MS` and let the child fire its own digest, or to construct
  `PurviewService` and `SlackBridge` inline in a test body to get a `flushDigest` handle. **The
  spawned entrypoint was chosen.** The inline fork breaks `02-architecture.md`'s rule that a
  test body may not call a service method, and would assert against a system assembled
  differently from the one `startHarness` builds — which is the exact shape of defect this
  suite exists to catch. No new harness code is needed; `server-proc.ts` already takes `env`
  and an optional pinned `port`.

## Why there are ten slices and not seven

Gate 4 approved seven. Four splits have happened since, each because a slice measured over
Charter §7's 400-line ceiling or hit an undeclared dependency. None of them trimmed a test to
fit.

- **Slice 0 → 0a + 0b**, before any implementation, after a run measured 515 lines against a
  ~330 estimate. This one required a gate 3 amendment: `harness/purview.ts` imported `sign.ts`
  and `slack-fake.ts` and started the fake unconditionally, making the harness one 391-line
  unit that could not be cut. The fake is now injected.
- **Slice 2 → 2a + 2b**, at 490 measured lines. This split used the point agreed in advance at
  gate 4, so the run split at a known seam instead of stopping for another spec run. That
  pre-agreement is the mechanism working as designed.
- **Slice 3 → 3a + 3b**, at an undeclared dependency rather than at the ceiling: tests 16 and
  17 need a digest to actually be delivered, and the only route to that at integration altitude
  is the spawned entrypoint from slice 2a, which the spec did not list as a blocker. No
  pre-agreement covered this one, which is why it needed the human decision recorded above.
- **Slice 4 → 4a + 4b**, at 488 measured lines, in gate 4 revision 3. This file predicted the
  split and asked for the seam to be agreed in advance; that prediction lived here and in
  `04-slices.md` but not in the issue's `factory-handoff:v1` comment, which is what an
  implement run reads. So the run claimed the slice whole, wrote all seven tests, went green,
  measured, and stopped — correct behaviour, and one whole run's work parked to get there.
  Revision 3 adds the rule that a named seam belongs in the handoff comment.

## Estimates ran high on every slice that has been measured

`04-slices.md` already warned that estimates are not budget, on the strength of one measured
miss. Seven slices in, the direction is consistent and the magnitude is not shrinking:

| Slice | Estimated | Measured | Variance |
|---|---|---|---|
| 0 (before the split) | ~330 | 515 | +56% |
| 2 (before the split) | ~280 | 490 | +75% |
| 3a alone (4 of slice 3's 6 tests) | ~220 for all six | 264 | +20% for two-thirds of the scope |
| 4 (before the split) | ~250 | 488 | **+95%** |

**The slice-4 prediction this section carried was right, and it did not help.** It said to read
#9 as likely to need a split and to agree the seam before a run claimed it. The seam was never
written into #9's handoff comment, so the run that claimed it never saw the warning — the
contract makes that comment authoritative, and correctly so, because a snapshot file is not a
handoff. Revision 3 fixes the mechanism rather than restating the prediction.

At ~70 measured lines per test, **no slice above five tests fits under the ceiling.** Slice 3b
(#28) was two tests and landed without incident. Any future slice should be sized against that
rate rather than against a fresh estimate.

## Standing instructions

**Slices add files. They never modify a file another slice created.** `package.json` and
`vitest.config.ts` were modified once, in #5, and never again.

**From gate 3:** the child-process tests — 6, 9 and 11 in slice 2a, 25 in slice 5, and both of
slice 3b's — must stay green without retries or sleeps beyond `server-proc.ts`'s single
`EADDRINUSE` retry. If they need more, that is a verdict that the entrypoint is not testable as
written: stop and file the `src/` config-extraction issue rather than adding a retry. This is a
stop condition, not a fallback.

## `archive/fq-5-slice0-original`

Green, correct, and the source of 507 of the 515 lines now spread across #5 and #18. Both have
merged, so its purpose is served — **the branch still exists on the remote and should be
deleted.** Do not merge it: it is the diff the ceiling stopped.

## Follow-ups filed

- #11 — run the factory gates automatically on every push (`ready-to-spec`, load-bearing).
  Still open. Until it lands, `pnpm test` runs only when a person or a routine runs it, which
  is the premise `02-architecture.md` built the suite layout around.
- #12 — record Slack delivery outcome so a dropped escalation is observable (`ready-to-spec`).
  Slice 3a's **test 15 is its acceptance test**, already on `main` in its pre-fix form,
  asserting the absence of a delivery signal and written to be inverted when #12 lands.
- #23 — enforce Charter §3 `TESTS_PROTECTED` in `gates.sh` rather than in prose
  (`ready-to-spec`).
- #32 — four merged run records carry timestamps an hour off. Untriaged. Not an FQ-3 defect,
  but it degrades every flow metric derived from these runs, including this file's dates.
- #33 — a PR body's prose can silently close a queue item (`ready-to-spec`, load-bearing).
  Filed off the back of #28 above; #26 may be a second instance.
- #40 — `workitem://{id}/tree` is unreadable unless *both* `depth` and `attention_only` are
  supplied (`ready-to-spec`). Found writing test 18. Slice 4a's tests spell out both variables
  and record why; that documents the edge rather than fixing it.
- #41 — the claim protocol locks the branch, not the working tree, so two local runs in one
  checkout collide silently (`ready-to-spec`, load-bearing). Observed during the slice 4 run,
  not hypothesised: a branch switch moved `HEAD` out from under a live run on #28. Repaired at
  the time; nothing on `main` is affected.

## Run records

Chronological, every FQ-3 run. Four of these timestamps are an hour off, minted from local
time and labelled `Z`; that is #32, not a gap in the record.

- `2026-08-28T235818Z-spec-3.md` — gates 1–4, revision 1
- `2026-08-30T144500Z-spec-3-recut.md` — gate 3 amendment 1, gate 4 revision 2
- `2026-08-30T174947Z-implement-5.md` — slice 0a, stopped RED
- `2026-08-30T180514Z-implement-5-resumed.md` — slice 0a, verifier rejected
- `2026-08-30T205710Z-implement-5-ratified.md` — slice 0a, merged
- `2026-08-30T215353Z-implement-18.md` — slice 0b
- `2026-08-30T220821Z-implement-6.md` — slice 1
- `2026-08-30T232000Z-implement-7.md` — slice 2a (timestamp wrong, see #32)
- `2026-08-30T235500Z-implement-8.md` — slice 3a (timestamp wrong, see #32)
- `2026-08-31T071843Z-implement-10.md` — slice 5
- `2026-08-31T093546Z-implement-26.md` — slice 2b, merged as PR #36
- `2026-08-31T132322Z-implement-28.md` — slice 3b, merged as PR #37
- `2026-08-31T132508Z-implement-9.md` — slice 4, stopped at 488 lines; the measurement gate 4
  revision 3 is built on
- `2026-08-31T134029Z-verify-37.md` — slice 3b, independent verification
- `2026-08-31T134100Z-spec-9.md` — gate 4 revision 3, the 4a/4b split
- `2026-08-31T135945Z-implement-38.md` — slice 4a, merged as PR #43
- `2026-08-31T141716Z-implement-39.md` — slice 4b, merged as PR #44
- `2026-08-31T142938Z-verify-44.md` — slice 4b, independent verification

All paths are relative to `docs/factory/runs/`.
