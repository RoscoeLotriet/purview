# Purview

Purview is a work tracker for teams where most of the work is done by agents. A human writes a goal in plain language; agents decompose it, execute it, and record state through an MCP interface as a byproduct of the calls they are already making — so the tracker stays current without anyone maintaining it. What that produces is a work tree growing faster and wider than any person can read, which means the substance of the product is the read side: healthy work collapses out of view, only blocked, failed, over-budget and approval-pending items surface upward, and the interruptions that genuinely need a human are routed against a budget of that human's attention rather than fired at will. It does not run agents and it is not a chat tool. It sits beside execution that already happens elsewhere and answers one question for the person who will be held responsible: is anything wrong, and does anything need me.

## Commands

```bash
pnpm install    # install
pnpm dev        # dev
pnpm test       # test
./.claude/scripts/gates.sh full   # the factory's deterministic verdict
```

## Conventions

<Language, framework, module layout, patterns to follow, patterns to avoid.
Keep this short and specific. Vague style guidance produces vague code.>

TypeScript

---

# Factory rules

This repository runs a software factory. Read `docs/factory/CONTRACT.md`, then
`docs/factory/CHARTER.md`, before acting. The contract is shared with Codex through
`AGENTS.md`; it is the source of truth for queue semantics and non-negotiable rules.
For first-time setup and the local dry run, follow `docs/factory/README.md`.

## Read first

The live queue is GitHub issue labels plus `factory-handoff:v1` comments.
`docs/factory/QUEUE.md` is a snapshot for humans and audit, so an unmerged snapshot must
never be used as the handoff between routines.

## Non-negotiable

1. **Never merge.** GitHub branch protection is the enforcement boundary; the local hook is
   a second layer.
2. **Never edit factory policy** unless the human explicitly asks in this session. Protected
   paths are listed in the contract.
3. **Never modify an existing test in an unattended run.** An interactive change needs
   explicit human approval and a human read.
4. **Gates fail closed.** Quote the `FACTORY_GATES:` line verbatim. `RED`,
   `MISCONFIGURED`, and required skips all block progress.
5. **Verification uses a fresh context.** Delegate to `factory-verifier`.
6. **Claim one live issue per run.** Win the deterministic remote-branch claim described in
   the contract, then replace `factory:ready-to-implement` with `factory:in-progress`.

## Stopping conditions

Stop and hand back to a human when any of these is true:

- gates went red twice on the same item
- the work turns out to touch a `LOAD_BEARING` path
- the diff would exceed the charter's line limit
- the item is still ambiguous after one clarification attempt
- the review queue is already at the charter's limit

The last one is the important one and the easiest to ignore. The constraint on this factory
is not how many agents can run in parallel. It is how many decisions are pending a human's
judgment at once. When that queue is full, producing more is not progress.

## State lives in files, not conversations

Write one immutable record under `docs/factory/runs/` using its documented format. Update
GitHub labels for operational state. Sessions end and transcripts are not the queue.

## Writing for the next reader

Commit messages and PR bodies are written for someone who was not in this session and
cannot ask you what you were thinking. On a `client-production` repo, assume that reader is
not the author and the time is six months from now.
