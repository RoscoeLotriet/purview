```
item: FQ-3
source: https://github.com/RoscoeLotriet/purview/issues/3
gate_1_product: approved 2026-08-29 (all six gaps; step 1 survives the readout)
gate_2_architecture: approved 2026-08-29 (pnpm test runs both suites; CI filed separately)
gate_3_design: approved 2026-08-29 (child process accepted; test 15 kept, narrowly scoped)
gate_4_slices: approved 2026-08-29 (six slices; queue written)
slices_completed: 0 / 6
open_questions:
  - none blocking. #5 is claimable by an implementation run.
```

## Slices

| Issue | Slice | Label | Blocked on |
|---|---|---|---|
| #5 | 0 — harness and tracer round trip | `ready-to-implement` | — |
| #6 | 1 — round-trip edge cases | `wait-to-implement` | #5 |
| #7 | 2 — bootstrap and configuration | `wait-to-implement` | #5 |
| #8 | 3 — Slack delivery and failure modes | `wait-to-implement` | #5 |
| #9 | 4 — resources and concurrent agents | `wait-to-implement` | #5 |
| #10 | 5 — restart boundary tripwire | `wait-to-implement` | #7 |

Promote a slice to `factory:ready-to-implement` when its blocker merges.

## Follow-ups filed

- #11 — run the factory gates automatically on every push (`ready-to-spec`, load-bearing)
- #12 — record Slack delivery outcome so a dropped escalation is observable (`ready-to-spec`);
  slice 3's test 15 is its acceptance test, written in its pre-fix form and expected to be
  inverted when it lands

## Standing instruction from gate 3

Seven tests in slice 2 spawn the real entrypoint as a child process. If they need retries or
sleeps beyond a single `EADDRINUSE` retry to stay green, that is a verdict that the entrypoint
is not testable as written: stop and file the `src/` config-extraction issue rather than
adding a retry.

## Run record

`docs/factory/runs/2026-08-28T235818Z-spec-3.md`
