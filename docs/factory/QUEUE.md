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

## FQ-3: test: integration suite covering the step-1 seams from PR #1
- disposition: ready-to-spec
- source: https://github.com/RoscoeLotriet/purview/issues/3
- last_triaged: 2026-08-28
- repro: not-attempted (this is a request for new test coverage, not a bug report; nothing to reproduce)
- files_expected: tests/integration/**, vitest.config.ts, package.json
- load_bearing: false
- gate_level: full
- done_when: `tests/integration/` covers gaps 1-6 named in the issue with tests that fail when the wiring they cover is broken; integration and unit suites are separately invocable and both green; no file under `src/` and no pre-existing test file is modified
- confidence: high
- notes: exceeds CHARTER.md §4 NEEDS_SPEC ("more than 5 files") and, on the issue's own estimate, §7 STOP_IF ("would exceed 400 changed lines"). The issue body already proposes a four-slice split (A harness + round trip, B bootstrap/config, C Slack transport, D concurrency/resources/restart); factory-spec should confirm or replace it. One open decision is a human call: slice B needs `src/server.ts` reachable by spawning it as a child process, or a `src/` change extracting a testable config parse — the issue forbids `src/` changes outright, so this needs a spec-time ruling.

---
