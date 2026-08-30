# Factory decisions

Why the factory is configured the way it is. Written by a human, informed by
`/factory-tune`.

This file exists so a future tuning pass can tell whether a past loosening was a mistake.
Without it, every constraint review starts from scratch and the same argument gets had
twice a year.

Newest at the top.

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
