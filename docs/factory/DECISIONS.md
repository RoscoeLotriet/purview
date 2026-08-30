# Factory decisions

Why the factory is configured the way it is. Written by a human, informed by
`/factory-tune`.

This file exists so a future tuning pass can tell whether a past loosening was a mistake.
Without it, every constraint review starts from scratch and the same argument gets had
twice a year.

Newest at the top.

---

### 2026-08-30 - Test protection is by path, and covers harness helpers and the runner config

**Change:** Charter §3. Before: "an unattended run may not modify an existing test file,"
with no definition of *test file*. After: a `TESTS_PROTECTED` glob list — `tests/**`,
`**/*.test.ts`, `vitest.config.ts` — and an explicit statement that protection is by path,
not by whether the file contains assertions. `.claude/agents/factory-verifier.md` now checks
those same globs.

**Evidence:** Not a run of green results. This resolves an ambiguity that was filed twice and
was already being answered, unannounced, by the tooling.

- Triage filed it on PR #15 as one of two blocking charter gaps: do non-`*.test.ts` helpers
  under `tests/` count? It named the cost of the broad reading — slices #6-#9 all planned to
  extend the harness, so "blocked on #5" would become "blocked on a human for every slice
  after."
- The tune run (`2026-08-30T134324Z-tune-charter-line-ceiling`) recorded it still open and
  predicted it would "bite the moment FQ-5 lands." FQ-5 landed in PR #21 the same day.
- The deciding fact: the verifier's tamper check was `git diff --stat <base>...HEAD --
  '*test*' '*spec*'`. Git's `*` crosses `/`, so it already matched
  `tests/integration/harness/purview.ts` and `vitest.config.ts`. Run against the FQ-5 merge
  it returns all three harness helpers plus the runner config. The broad reading was already
  the operative behavior; the charter simply had not said so. Ratifying it changes the words,
  not the enforcement.

**Reasoning:** §3 exists because "an unexplained green suite after an agent edited the tests
is weak evidence." That rationale applies *more* to helpers than to assertions, not less. A
reviewer scanning for a flipped `expect` will catch a flipped `expect`. They will not catch
an `awaitCondition` that returns early, a harness that constructs a stub, or a
`vitest.config.ts` `include` that drops a project from the suite — each of which leaves the
suite green while it stops proving anything, and none of which looks like a test edit.

`vitest.config.ts` is included deliberately even though it sits outside `tests/`. It is the
file that decides which tests run at all, it was already caught by the old grep, and FQ-3
modifies it once in slice 0a and never again — so protecting it costs nothing already
planned.

**Risk accepted:** An unattended run that needs to extend a harness now stops for a human
instead of proceeding. This is the cost triage named and it is real. Two things make it
tolerable today rather than in general: FQ-3's slices are specified to add files rather than
modify them, so nothing currently queued hits it; and no unattended runs are actually firing
— there is no CI and no monitor run has ever executed. This is a cheap decision now that
would be an expensive one later.

**Revisit if:** unattended runs become routine and this rule starts stopping them on work
that is plainly additive — a slice appending a helper function to an existing harness file
with no change to existing behavior. That is the case for a narrower rule (protect
`**/*.test.ts` only) or a named-waiver path in the handoff comment. Until an unattended run
is actually blocked by it, there is nothing to measure.

---

### 2026-08-30 - The 400-line stop condition counts code only

**Change:** Charter §7, `STOP_IF`. Before: "The change would exceed 400 changed lines."
After: "The change would exceed 400 changed lines **of code**." Documentation does not count
toward the ceiling and gets no ceiling of its own. Documentation is defined as `docs/**` and
`**/*.md`; everything else counts, including tests, `package.json`, lockfiles, build and
tooling config, and CI workflows. The charter carries the exact `git diff --numstat`
invocation so the count is measured, not estimated.

**Evidence:** Thin, and worth saying so. This is not a loosening earned by a run of green
results — the factory has four run records total. It is the resolution of a rule that could
not be applied as written.

- The rule stopped one run cold and was flagged as unresolvable by an independent verifier:
  PR #14, a documents-only spec, 1218 changed lines, 0 of them code. The verifier
  (`2026-08-29T013500Z-verify-14`, defect D4) recorded two available readings of §7 and
  correctly refused to choose between them, since an agent waiving a stop condition on its
  own initiative is the failure mode the charter exists to prevent.
- Triage then filed the same gap a second time, on PR #15, noting it had "stopped a run
  cold" twice.
- Under the new rule PR #14 measures 0 lines and would not have stopped.

**Reasoning, since the numbers do not carry it:** the ceiling is a limit on how much logic a
reviewer can hold at once. Prose is not read the way logic is — a reviewer skims a spec by
section and cannot skim a diff of control flow. The two things were sharing a unit, not a
meaning.

**Risk accepted:** Documentation diffs are now unbounded. A 5,000-line spec is a real review
burden and nothing in the charter now stops one from being produced. This is a known hole,
accepted deliberately rather than overlooked. The mitigating fact is that specs are written
by `factory-spec`, which is interactive and gated by a human at each step, so a runaway spec
has a human in the loop by construction in a way an unattended implementation run does not.

**Revisit if:** a spec or docs PR arrives that a human declines to review on size grounds, or
that gets rubber-stamped because it was too long to read. Either observation means the docs
side needs its own ceiling — a higher one, counted separately — rather than none.

---

## Template

### 2026-08-16 - <what changed>

**Change:** <the specific rule, before and after>

**Evidence:** <the run of data. "23 dependency bumps over 6 weeks, zero escapes" is
evidence. "It seemed fine" is not.>

**Risk accepted:** <what this makes more likely, stated plainly>

**Revisit if:** <the observation that would reverse this>

---

## Seed entries

### 2026-08-16 - Merge is never automated, on any tier

**Change:** No routine or session may merge, on any tier including `revival`. Enforced by a
GitHub ruleset or branch protection. Harness hooks block common shell routes as a second
layer.

**Evidence:** Structural rather than empirical. The merge decision is where accountability
lives, and it is the one point where a human takes responsibility for consequences.

**Risk accepted:** Throughput is capped by human review availability. This is intentional.
The binding constraint on a factory is decisions pending judgment, not agents running.

**Revisit if:** Never, at any tier.

---

### 2026-08-16 - Verification is a separate agent from implementation

**Change:** `factory-implement` must delegate to the `factory-verifier` subagent and may
not self-certify.

**Evidence:** An agent asked to check its own work grades the intent it already had. The
separation is the only thing that makes a green result mean anything.

**Risk accepted:** Roughly doubles token cost per item. Worth it.

**Revisit if:** Never. Tune the verifier's strictness instead.

---

### 2026-08-16 - Unattended runs may not modify existing test files

**Change:** An unattended run stops before modifying a pre-existing test file. An
interactive session requires explicit human approval, stays draft, and receives a human
read regardless of gate status.

**Evidence:** Agents can rewrite assertions to match broken behavior. An unexplained green
suite after the implementation agent changed the tests is weak evidence and can be
invisible to ordinary automated checks because everything passes.

**Risk accepted:** Legitimate test refactors need a human. Acceptable.

**Revisit if:** Never, while the gates depend on the tests being trustworthy.
