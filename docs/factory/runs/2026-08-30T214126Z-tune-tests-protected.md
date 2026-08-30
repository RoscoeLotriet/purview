---
run_id: 2026-08-30T214126Z-tune-tests-protected
stage: tune
started_at: 2026-08-30T22:05:00Z
finished_at: 2026-08-30T22:41:26Z
status: succeeded
issue: none
pull_request: pending (opened by this run)
gate_level: deep
gate_status: GREEN
verifier: not-run
human_required: true
---

# Tune run — Charter §3 scope decided: test protection is by path

Interactive session. Started as a `/factory status` report; the human asked what to do about
the one open charter gap and then authorized the edits explicitly, in this session, including
the charter itself.

## Why the run happened

The gap had been filed twice and never decided:

- Triage, on PR #15 (`2026-08-29T020000Z-triage-run`, gap 1): does §3's "existing test file"
  cover non-`*.test.ts` helpers under `tests/`? It named the cost of the broad reading —
  slices #6–#9 all plan to extend the harness, so "blocked on #5" becomes "blocked on #5,
  then blocked on a human for every slice after."
- The tune run `2026-08-30T134324Z-tune-charter-line-ceiling` recorded it still open and
  predicted it would "bite the moment FQ-5 lands."

FQ-5 landed in PR #21 at 21:13Z. Gap 2 from that same triage filing — the 400-line ceiling —
was already resolved earlier the same day. This one was the remainder.

## The finding that decided it

The verifier's tamper check was:

```bash
git diff --stat <base-ref>...HEAD -- '*test*' '*spec*'
```

Git pathspec wildcards cross `/`, so `*test*` already matched `tests/integration/harness/*.ts`
and `vitest.config.ts`. Measured against the FQ-5 merge range (`a88cd52...cbba004`) it
returns all three harness helpers plus the runner config:

```
tests/integration/harness/ports.ts      |  23 ++
tests/integration/harness/purview.ts    | 114 ++
tests/integration/harness/wait.ts       |  52 ++
tests/integration/mcp-round-trip...ts   | 116 ++
vitest.config.ts                        |  26 +-
```

**The broad reading was already the operative behavior.** It was being enforced by a glob
accident rather than by a rule, in a file nobody had read as policy. Ratifying it changes the
words, not the enforcement. That is what made this a cheap decision rather than a contested
one.

The same grep's `'*spec*'` matched `docs/factory/specs/**`, so every spec PR tripped a tamper
check with nothing to tamper with. A gate that fires on work you are meant to approve trains
you to wave it through; it was removed.

## What changed

Four files, one decision.

| File | Change |
|---|---|
| `docs/factory/CHARTER.md` §3 | `TESTS_PROTECTED` glob list added; prose states protection is by path |
| `.claude/agents/factory-verifier.md` | check now uses the charter's globs, not an approximation |
| `docs/factory/DECISIONS.md` | new top entry: evidence, reasoning, risk accepted, revisit condition |
| `docs/factory/specs/FQ-3/04-slices.md` | standing rule cites the decision instead of describing an open question |

`TESTS_PROTECTED` is `tests/**`, `**/*.test.ts`, `vitest.config.ts`. The runner config was
included on the human's explicit instruction after being raised as a separate judgment call —
it decides which tests run at all, it was already caught by the old grep, and FQ-3 modifies it
once in slice 0a and never again.

`LAST_REVIEWED` was already `2026-08-30` and was not bumped.

## Authorization, and the two guards that held

Charter §2 and the contract forbid an agent editing `CHARTER.md` or anything under `.claude/`
unless a human asks in the current session. The human did, in as many words: *"make all four
edits, and include vitest.config.ts."*

The mechanical guards still refused, and were not routed around:

- `.claude/settings.json` denies `Edit(docs/factory/CHARTER.md)`. The charter edit was
  **applied by the human**, from replacement text supplied in the session. No agent wrote to
  that file.
- `.claude/hooks/block-merge.sh` rejects any shell command touching a protected factory path,
  including an attempt to `cp` the charter into a scratch directory to generate a patch. That
  attempt was abandoned rather than worked around.

`.claude/agents/factory-verifier.md` is not in the settings deny list and was edited directly
under the session authorization. It is a `LOAD_BEARING` path, which forces `deep` gates and a
human read — both apply to this PR.

## Gates

```
FACTORY_GATES: level=deep status=GREEN passed=6 failed=0 failing=none skipped=mutation misconfigured=none
```

`deep` because `.claude/**` is load-bearing. `mutation` is not in `REQUIRED_DEEP` in
`.factory/gates.conf`, so its skip is not a required skip.

0 code lines against the 400 ceiling — the diff is documentation and agent configuration only.

## What this does not do

- **No enforcement was added.** `TESTS_PROTECTED` is read by agents, not by `gates.sh`. Two
  layers now agree in prose; nothing mechanically fails a run that violates it. The verifier
  catching it depends on the verifier looking.
- **No queue item was touched.** #5 remains open and mislabelled `factory:awaiting-review`
  after PR #21 merged, and #18 is still `wait-to-implement` waiting on that label to move.
  That is the outstanding human action and it is unrelated to this run.

## Risk accepted

An unattended run that needs to extend a harness now stops for a human. Tolerable today
because FQ-3's slices add files rather than modify them, and because no unattended runs are
firing — there is no CI and no monitor run has ever executed. Revisit when a slice is actually
blocked on plainly additive work. Recorded in `DECISIONS.md`.

Nothing merged. No labels changed.
