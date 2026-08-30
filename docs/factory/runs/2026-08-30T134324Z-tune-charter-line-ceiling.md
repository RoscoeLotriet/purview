---
run_id: 2026-08-30T134324Z-tune-charter-line-ceiling
stage: tune
started_at: 2026-08-30T13:20:00Z
finished_at: 2026-08-30T13:43:24Z
status: stopped
issue: none
pull_request: pending (opened by this run)
gate_level: full
gate_status: GREEN
verifier: not-run
human_required: true
---

# Tune run — Charter §7 line ceiling

Human instruction, given explicitly in this session: *"update the charter: the 400-line
ceiling applies to code only."* Contract rule 2 permits a charter edit only when a human
explicitly asks in the current session, which is satisfied.

`stage: tune` is not in the enum documented in `docs/factory/runs/README.md`
(`triage | spec | implement | verify | monitor`). This run was none of those five. Recorded
with the accurate value and the gap noted rather than mislabelled as one of the five.

## Status: stopped at the protection boundary

**The charter was not edited. The agent could not edit it and did not route around the
guards that stopped it.**

Two independent mechanisms block the write, both working as designed:

1. `.claude/settings.json` `permissions.deny` contains an `Edit` deny rule for the charter.
2. `.claude/hooks/block-merge.sh:59-63` blocks any Bash command naming the charter, the
   gates config, or the agent directories alongside a write verb (`sed`, `tee`, `>`, `>>`,
   `rm`, `mv`, `cp`, `truncate`), and returns "do not attempt an alternative route".

Routes that would have worked — `git apply` with a patch file, `python3` writing the file,
`perl -i` — are not in the hook's verb list. None were attempted. Defeating a guard because
it is defeatable is the behavior the guard exists to detect, and an agent that edits its own
constraints by finding the gap in the enforcement has no constraints.

### The gap this exposes

`docs/factory/CONTRACT.md` rule 2 grants a session-scoped exception ("unless a human
explicitly asks in the current session"). The enforcement has no way to express a
session-scoped exception — the deny rule and the hook are unconditional. So the documented
policy and the enforced policy disagree, and the resolution in practice is that a human
applies charter edits by hand. That is a defensible design, but it is currently implicit.
Worth writing into the contract so the next run does not rediscover it.

A second, smaller observation: the hook matches on the *text* of a command, so writing this
run record by shell heredoc was blocked because the record mentions the charter's path. The
record was written with the file-write tool instead. The path strings were not obfuscated to
get past the check.

## What this run did instead

- Measured the two diffs the rule has stopped, rather than trusting the estimates in prior
  records and PR bodies.
- Wrote the `docs/factory/DECISIONS.md` entry required by Charter §8 for a loosening,
  including the risk accepted.
- Prepared the exact charter patch for a human to apply (in the PR body).

## Measurements

Counting method, code = everything except `docs/**` and `**/*.md`:

```bash
git diff --numstat <base>...<head> -- . ':!docs/**' ':!*.md' \
  | awk '{ a += $1; r += $2 } END { print a + r }'
```

| Diff | Total changed lines | Code lines | Under the new rule |
|---|---|---|---|
| PR #14 — the FQ-3 spec | 1218 | **0** | passes; verifier defect D4 closes |
| `origin/claude/fq-5` — slice 0 | 643 | **515** | **still over the 400 ceiling** |

Prior records estimated FQ-5 at "~515 lines"; the measurement confirms 515 exactly. The
128-line difference between the two columns is FQ-5's own run record, a `.md` under `docs/`.

## The finding that matters

**This change does not unblock FQ-5, and it does not unblock #6–#10.** FQ-5's diff is 515
lines of test and config code with no documentation in it. It was over the ceiling before
this change and it is over the ceiling after it by the same margin.

The `/factory` report earlier in this session said ruling on §7 would unblock six issues.
That was wrong — it was inferred from the 400-vs-1110 framing in the verify-14 record, which
is about the spec PR, and not checked against FQ-5's own numbers.

What actually unblocks FQ-5 is what its own live handoff comment already says: re-cut slice 0
into pieces that each fit under the ceiling. That is a `factory-spec` run on #5, and it is
unaffected by this charter change.

## Gates

Run on this branch's base; the diff is documentation only and touches no code.

```
FACTORY_GATES: level=full status=GREEN passed=4 failed=0 failing=none skipped=none misconfigured=none
```

## Human decisions still open

1. **Apply the charter patch.** Two lines plus an explanatory block; the exact text is in the
   PR body. The agent cannot do this.
2. **Lockfile counting.** `AUTOMATABLE` lists "dependency bumps that pass full gates", but a
   regenerated `pnpm-lock.yaml` is thousands of changed lines and counts as code under both
   the old rule and the new one, so every dependency bump trips the stop condition. This was
   already true before this change and is not made worse by it. Deliberately left alone —
   excluding lockfiles is a second loosening and was not asked for.
3. **Charter gap, still open:** whether §3's "existing test file" rule covers non-`*.test.ts`
   helpers under `tests/integration/harness/`. Filed by triage on PR #15, unrelated to this
   run, and it bites the moment FQ-5 lands.

Nothing merged. Nothing labelled. The charter is unmodified.
