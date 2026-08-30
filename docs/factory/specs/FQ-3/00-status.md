```
item: FQ-3
source: https://github.com/RoscoeLotriet/purview/issues/3
gate_1_product: approved 2026-08-29 (all six gaps; step 1 survives the readout)
gate_2_architecture: approved 2026-08-29 (pnpm test runs both suites; CI filed separately)
gate_3_design: approved 2026-08-29 (child process accepted; test 15 kept, narrowly scoped)
gate_3_amendment_1: approved 2026-08-30 (injected SlackFake; tap() becomes a free function)
gate_4_slices: approved 2026-08-30, revision 2 (seven slices; slice 0 split; queue written)
slices_completed: 0 / 7
open_questions:
  - none blocking. #5 is claimable by an implementation run.
  - not blocking, but unresolved: does Charter §3's "existing test file" rule cover
    non-*.test.ts helpers under tests/? Routed around by design (slices add files, never
    modify another slice's) so FQ-3 needs no waiver. The next spec wanting a shared helper
    will hit it again. Owner: human.
```

## Slices

| Issue | Slice | Label | Blocked on |
|---|---|---|---|
| #5 | 0a — harness core and the MCP tracer | `ready-to-implement` | — |
| #18 | 0b — Slack fake, signing, full round trip | `wait-to-implement` | #5 |
| #6 | 1 — round-trip edge cases | `wait-to-implement` | #18 |
| #7 | 2 — bootstrap and configuration | `wait-to-implement` | #18 |
| #8 | 3 — Slack delivery and failure modes | `wait-to-implement` | #18 |
| #9 | 4 — resources and concurrent agents | `wait-to-implement` | #18 |
| #10 | 5 — restart boundary tripwire | `wait-to-implement` | #7 |

Promote a slice to `factory:ready-to-implement` when its blocker merges.

## Why there are seven slices and not six

Slice 0 was approved at ~330 estimated lines. An implementation run built it, gates came back
GREEN on the first run, and the diff measured **515** — 56% over the estimate, 29% over
Charter §7's ceiling. The work was correct; the sizing was not. Slice 0 became 0a (#5) and
0b (#18).

Splitting required a gate 3 amendment because `harness/purview.ts` imported `sign.ts` and
`slack-fake.ts` and started the fake unconditionally, making the harness one 391-line unit
that could not be cut. The fake is now injected.

Two defects in revision 1 were fixed in passing:

- Slice 1 was specified as *extending* another slice's `*.test.ts` file, which Charter §3
  forbids under any reading. It could not have run unattended. It now gets its own file.
- Estimates were being treated as budget. They are now marked measured or estimated, and
  every slice carries the instruction to measure before opening a PR and to split rather than
  trim if it exceeds 400.

## Standing instructions

**Slices add files. They never modify a file another slice created.** `package.json` and
`vitest.config.ts` are modified once, in #5, and never again.

**From gate 3:** six tests in slice 2 (6–11) spawn the real entrypoint as a child process;
test 25 in slice 5 is the seventh. If they need retries or sleeps beyond a single
`EADDRINUSE` retry to stay green, that is a verdict that the entrypoint is not testable as
written: stop and file the `src/` config-extraction issue rather than adding a retry.

**Slice 2 (#7) is the most likely to overflow** at ~280 estimated. Its split point is agreed
in advance on the issue, so an implementation run that hits the ceiling splits at a known
seam instead of stopping for another spec run.

## `archive/fq-5-slice0-original`

Green, correct, and the source of 507 of the 515 lines now spread across #5 and #18.
Cherry-pick from it. **Do not merge it** — it is the diff the ceiling stopped. Close it once
#18 merges.

## Follow-ups filed

- #11 — run the factory gates automatically on every push (`ready-to-spec`, load-bearing)
- #12 — record Slack delivery outcome so a dropped escalation is observable (`ready-to-spec`);
  slice 3's test 15 is its acceptance test, written in its pre-fix form and expected to be
  inverted when it lands

## Run records

- `docs/factory/runs/2026-08-28T235818Z-spec-3.md` — gates 1–4, revision 1
- `docs/factory/runs/2026-08-30T144500Z-spec-3-recut.md` — gate 3 amendment 1, gate 4 revision 2
