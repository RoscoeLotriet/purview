```
item: FQ-3
source: https://github.com/RoscoeLotriet/purview/issues/3
gate_1_product: approved 2026-08-29 (all six gaps; step 1 survives the readout)
gate_2_architecture: approved 2026-08-29 (pnpm test runs both suites; CI filed separately)
gate_3_design: approved 2026-08-29 (child process accepted; test 15 kept, narrowly scoped)
gate_3_amendment_1: approved 2026-08-30 (injected SlackFake; tap() becomes a free function)
gate_4_slices: approved 2026-08-30, revision 2 (seven slices; slice 0 split; queue written)
slices_completed: 6 / 9
tests_landed: 14 / 26
status_as_of: 2026-08-31T09:00Z
open_questions:
  - blocking #26 only: test 10 as specced cannot fail against the bug it exists to catch,
    because a principal's display_name is not observable on any wire surface. Needs a
    product decision before that test is written. Tests 7 and 8 are unaffected. Owner:
    human. See "Two slices left the queue without landing" below.
  - not blocking: nothing. #28 and #9 are both claimable as they stand.
```

**Two slices are further along than the gate-4 plan describes, and two are further behind.**
This file was three days stale — it still read `slices_completed: 0 / 7` after six slices had
merged — so treat the table below as the current shape and `04-slices.md` as the plan that
was approved.

## Slices

Nine, not the seven approved at gate 4. Slices 2 and 3 each split during implementation; both
splits are recorded on their issues. Test numbering follows `03-design.md`; slice 0a's tracer
is unnumbered, which is why the denominator is 26 and not 25.

| Issue | Slice | Tests | State | Evidence |
|---|---|---|---|---|
| #5 | 0a — harness core and the MCP tracer | tracer | **merged** | PR #21 · `cbba004` |
| #18 | 0b — Slack fake, signing, full round trip | 1 | **merged** | PR #24 · `0e43740` |
| #6 | 1 — round-trip edge cases | 2–5 | **merged** | PR #25 · `5344776` |
| #7 | 2a — the entrypoint spawned as a process | 6, 9, 11 | **merged** | PR #27 · `79f4c53` |
| #26 | 2b — signing secret and principal config | 7, 8, 10 | `wait-to-implement` (stale) | reopened; see below |
| #8 | 3a — Slack delivery over a real socket | 12–15 | **merged** | PR #29 · `9bbdabb` |
| #28 | 3b — digest delivery | 16, 17 | `ready-to-implement` | claimable now |
| #9 | 4 — resources and concurrent agents | 18–24 | `ready-to-implement` | claimable now |
| #10 | 5 — restart boundary tripwire | 25 | **merged** | PR #31 · `4636cc8` |

Fourteen integration tests are on `main`, in six files, all green at `full` gates. The twelve
not yet written are tests 7, 8, 10 (#26), 16, 17 (#28) and 18–24 (#9).

## Two slices left the queue without landing

Both were closed as *completed* while their tests did not exist. Both have been reopened.

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
drop. Its label still reads `factory:wait-to-implement` against a blocker (#7) that merged as
`79f4c53`; promoting it is a triage decision and was left to a triage run.

What was at stake in that close is **test 8**, which `04-slices.md` calls the sharpest test
in FQ-3: `src/http/app.ts` skips signature verification entirely when no signing secret is
configured, so a deployment that forgets it exposes an endpoint where anyone who can reach the
port may answer questions addressed to the accountable human — and the transcript attributes
those answers to that human. The test does not fix that. It pins it as an explicit fact so the
behaviour cannot be discovered by accident later. Dropping it drops the record, not the risk.

**#26 carries two debts a human still owes it**, both raised by PR #27 and neither settled. The
first is confirming that slice 2's split point still holds now that the overflow measured +75%
rather than the +56% the pre-agreement was made against. The second is the harder one and is
this file's one blocking open question: **test 10 as specced cannot fail against the bug it
exists to catch.** A principal's `display_name` is not observable on any wire surface — no MCP
tool lists principals, `principal://{id}/queue` is keyed by id, and `src/http/app.ts` falls back
to `service.defaultHuman` when it cannot match an interaction's `user_name`. So the obvious
name-lookup assertion passes whether or not `PURVIEW_HUMAN` was honoured. Making it observable
is a `src/` change the slice may not make, and whether it is worth doing is a product decision.
Tests 7 and 8 are unaffected and remain writable as they stand.

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

## Why there are nine slices and not seven

Gate 4 approved seven. Three splits happened during implementation, each because a slice
measured over Charter §7's 400-line ceiling or hit an undeclared dependency. None of them
trimmed a test to fit.

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

## Estimates ran high on every slice that has been measured

`04-slices.md` already warned that estimates are not budget, on the strength of one measured
miss. Six slices in, the direction is consistent and the magnitude is not shrinking:

| Slice | Estimated | Measured | Variance |
|---|---|---|---|
| 0 (before the split) | ~330 | 515 | +56% |
| 2 (before the split) | ~280 | 490 | +75% |
| 3a alone (4 of slice 3's 6 tests) | ~220 for all six | 264 | +20% for two-thirds of the scope |

Slice 4 (#9) is estimated at ~250 for seven tests and is the largest thing left. On the
per-test rate slice 3a actually measured, seven tests is well over the ceiling. **Read #9 as
likely to need a split, and prefer agreeing its split point before a run claims it** — the
difference between slice 2 (split cleanly, no spec run) and slice 3 (stopped, needed a human)
was entirely whether the seam had been named in advance.

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

## Run records

- `docs/factory/runs/2026-08-28T235818Z-spec-3.md` — gates 1–4, revision 1
- `docs/factory/runs/2026-08-30T144500Z-spec-3-recut.md` — gate 3 amendment 1, gate 4 revision 2
- `docs/factory/runs/2026-08-30T174947Z-implement-5.md` — slice 0a, stopped RED
- `docs/factory/runs/2026-08-30T180514Z-implement-5-resumed.md` — slice 0a, verifier rejected
- `docs/factory/runs/2026-08-30T205710Z-implement-5-ratified.md` — slice 0a, merged
- `docs/factory/runs/2026-08-30T215353Z-implement-18.md` — slice 0b
- `docs/factory/runs/2026-08-30T220821Z-implement-6.md` — slice 1
- `docs/factory/runs/2026-08-30T232000Z-implement-7.md` — slice 2a (timestamp wrong, see #32)
- `docs/factory/runs/2026-08-30T235500Z-implement-8.md` — slice 3a (timestamp wrong, see #32)
- `docs/factory/runs/2026-08-31T071843Z-implement-10.md` — slice 5
