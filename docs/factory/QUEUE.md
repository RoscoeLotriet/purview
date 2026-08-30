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

_Snapshot written by `factory-spec` on 2026-08-30, superseding the `factory-triage` snapshot
of the same day (#16). Live labels are the source of truth._

This run re-cut FQ-3's slice 0 after an implementation attempt measured it at 515 changed
lines against Charter §7's 400-line ceiling. Gate 3 amendment 1 and gate 4 revision 2 were
both approved by a human on 2026-08-30. **FQ-5 is claimable again**, now scoped to the
harness core and the MCP tracer; the Slack half is the new FQ-18.

Counts: ready-to-implement=1 (#5), ready-to-spec=2 (#11, #12), needs-info=0,
wait-to-implement=7 (#3, #6, #7, #8, #9, #10, #18).

## Claimable now

## FQ-5: integration slice 0a — harness core and the MCP tracer
- disposition: ready-to-implement
- source: https://github.com/RoscoeLotriet/purview/issues/5
- parent: #3 · spec: `docs/factory/specs/FQ-3/` (gate 4 revision 2)
- files_expected: tests/integration/harness/{ports,wait,purview}.ts, tests/integration/mcp-round-trip.integration.test.ts, package.json, vitest.config.ts
- load_bearing: false
- gate_level: full
- done_when: `pnpm test` runs both vitest projects and is what the gates script invokes; `pnpm test:unit` runs unit only; one integration test drives create → claim → escalate(non-blocking) over a real MCP client on a real socket; `startHarness` matches gate 3 amendment 1 (injected `SlackFake`, type-only import, no `tap()`); nothing under `src/` modified
- confidence: high
- notes: ~253 lines, 203 of them measured on `origin/claude/fq-5` — cherry-pick, do not rewrite. Blocks everything else in FQ-3. `pnpm test` must run integration too: the gates script invokes exactly `pnpm test` and there is no CI (#11), so a separate script would gate nothing.

---

## Blocked on a named dependency

## FQ-18: integration slice 0b — Slack fake, signing, and the full round trip
- disposition: wait-to-implement · **blocked on #5**
- source: https://github.com/RoscoeLotriet/purview/issues/18
- gate_level: full · confidence: high
- done_when: the held `work_escalate` promise is released by a signed tap whose `action_id` was read off the card recorded by the fake; no assertion on the `/slack/interactions` response
- notes: ~329 lines, 304 measured. Slice 0's original test 1, unchanged. Promote when #5 merges.

## FQ-6: integration slice 1 — round-trip edge cases
- disposition: wait-to-implement · **blocked on #18**
- source: https://github.com/RoscoeLotriet/purview/issues/6
- gate_level: full · confidence: high
- done_when: tests 2–5 pass; test 3 proves non-release via `stillPending`, not a status code
- notes: ~180 lines. **Now its own file** (`escalation-edge-cases.integration.test.ts`) — revision 1 had it extending another slice's `*.test.ts`, which Charter §3 forbids.

## FQ-7: integration slice 2 — bootstrap and configuration
- disposition: wait-to-implement · **blocked on #18**
- source: https://github.com/RoscoeLotriet/purview/issues/7
- gate_level: full · confidence: medium
- done_when: the real entrypoint is spawned under `tsx` and tests 6–11 pass; test 8 characterizes the open endpoint deliberately
- notes: ~280 lines — **the slice most likely to overflow.** Split point pre-agreed on the issue so no new spec run is needed. Gate 3 standing instruction: retries or sleeps to stay green are a verdict, not a patch.

## FQ-8: integration slice 3 — Slack delivery and failure modes
- disposition: wait-to-implement · **blocked on #18**
- source: https://github.com/RoscoeLotriet/purview/issues/8
- gate_level: full · confidence: high
- done_when: tests 12–17 pass; test 15 names #12 as the issue that will invert it
- notes: ~220 lines

## FQ-9: integration slice 4 — resources and concurrent agents
- disposition: wait-to-implement · **blocked on #18**
- source: https://github.com/RoscoeLotriet/purview/issues/9
- gate_level: full · confidence: high
- done_when: tests 18–24 pass; test 19 fails if the bare `workitem://{id}` template is registered first
- notes: ~250 lines. Only test 24 needs #18; tests 18–23 need only #5. Promotable early with test 24 deferred if review capacity allows.

## FQ-10: integration slice 5 — restart boundary tripwire
- disposition: wait-to-implement · **blocked on #7**
- source: https://github.com/RoscoeLotriet/purview/issues/10
- gate_level: full · confidence: high
- done_when: work created before `SIGTERM` is absent after a restart on the same port
- notes: ~70 lines. If #7 splits, the blocker becomes its 2a half.

## FQ-3: integration suite covering the step-1 seams (parent)
- disposition: wait-to-implement · **blocked on its own slices — #5, #18, #6, #7, #8, #9, #10**
- source: https://github.com/RoscoeLotriet/purview/issues/3
- notes: tracking issue. Closes when the seven slices land.

---

## Needs a human spec run

## FQ-11: run the factory gates automatically on every push
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/11
- notes: `.github/workflows/**` is load-bearing under Charter §2 — `deep` gates and a human read. Nothing runs the gates automatically today, which is why FQ-5's `pnpm test` wiring matters.

## FQ-12: record Slack delivery outcome so a dropped escalation is observable
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/12
- notes: `src/service/purview.ts:727-736` swallows every bridge failure. A `src/` change and a product decision. Slice 3's test 15 is its acceptance test, written in its pre-fix form and expected to be inverted when this lands.

---

## Wave plan for FQ-3

Charter §7 stops the factory above 3 items awaiting human review, so this is a constraint,
not a suggestion. The 0a/0b split adds a wave.

| Wave | Slices | Review load |
|---|---|---|
| 1 | #5 (0a) | 1 PR — everything depends on it |
| 2 | #18 (0b) | 1 PR — slices 1–4 all consume its files |
| 3 | #6, #7, #8 | 3 PRs — exactly at the charter limit |
| 4 | #9, #10 | 2 PRs |

If a wave-3 item is rejected, #9 can be promoted to fill the gap.

## Standing rule for every FQ-3 slice

**Slices add files. They never modify a file another slice created.** This keeps the suite
inside Charter §3 without needing a waiver on the open question of whether §3 covers
non-`*.test.ts` helpers under `tests/`.

Measure before opening a PR, per Charter §7:

```bash
git diff --numstat origin/main...HEAD -- . ':!docs/**' ':!*.md' \
  | awk '{ a += $1; r += $2 } END { print a + r }'
```

Over 400: stop and split. Do not trim tests to fit.

## Do not merge `origin/claude/fq-5`

It is green and 507 of its 515 lines are reused across #5 and #18, but it *is* the 515-line
diff the ceiling stopped. It is a cherry-pick source. Close it once #18 merges.
