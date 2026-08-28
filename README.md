# Purview

A work tracker for teams where most of the work is done by agents. A human writes a
goal; agents decompose and execute it, recording state through MCP as a byproduct of
calls they are already making. Healthy work collapses out of view; only blocked,
failed, over-budget and approval-pending items surface. Interruptions are routed
against a budget of human attention.

This is **build-order step 1** of `docs/spec/purview-product-spec.md`: schema, MCP
server, Slack escalation bridge. No web UI. Point an agentic squad at it and watch
two numbers — fan-out ratio and escalation resolution latency.

## Quickstart

```bash
pnpm install
pnpm dev          # starts the server on :8788
pnpm test         # vitest
./.claude/scripts/gates.sh full
```

## Connecting an agent (MCP)

The server speaks MCP over streamable HTTP at `POST /mcp`. Identify the agent with
the `x-purview-principal` header; unknown names are auto-registered as agent
principals delegated by the configured human.

Claude Code example:

```bash
claude mcp add purview --transport http http://localhost:8788/mcp \
  --header "x-purview-principal: my-agent"
```

Tools: `work_create`, `work_fan_out`, `work_claim`, `work_report`,
`work_set_state`, `work_escalate`, `work_complete`, `work_abandon`, `work_query`.
Resources: `workitem://{id}`, `workitem://{id}/tree?depth=N&attention_only=true`,
`principal://{id}/queue`, `workitem://{id}/provenance`.

`work_escalate` with `blocking: true` long-polls until a human answers or the
timeout fires, and returns `{resolution, chosen_option_id, free_text, resolved_by,
waited_seconds}` — the agent branches on it deterministically. `timeout_action`
defaults from the item's blast radius: `irreversible`/`costly` → `abort`,
`none`/`reversible` → `proceed`.

## Slack setup

1. Create a Slack app with an **incoming webhook** into your escalation channel;
   set `SLACK_WEBHOOK_URL`.
2. Enable **interactivity** and point the request URL at
   `https://<your-host>/slack/interactions`; set `SLACK_SIGNING_SECRET`.
3. Escalations above the digest band render as cards with option buttons. One tap
   resolves; the card is updated in place. Low-severity escalations batch into a
   digest (`DIGEST_INTERVAL_MS`).

Without Slack configured the bridge logs to stdout and everything else works.

> **Attribution caveat (v0):** the signature proves an interaction came from your
> Slack workspace, not which member tapped. Taps from usernames that don't match a
> known human principal are recorded as the default accountable human. Keep the
> escalation channel restricted to people allowed to answer for them.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8788` | HTTP port |
| `PURVIEW_HUMAN` | `operator` | Display name of the accountable human; agents delegate to them |
| `SLACK_WEBHOOK_URL` | unset | Incoming webhook for the escalation channel |
| `SLACK_SIGNING_SECRET` | unset | Verifies Slack interaction signatures (unset: not enforced) |
| `DIGEST_INTERVAL_MS` | `0` (off) | Cadence for flushing the low-severity digest |

## What is deliberately not here (yet)

- **Persistence.** The server runs on an in-memory store behind a `Store`
  interface; state does not survive a restart. `db/schema.sql` is the durable
  Postgres + ltree schema the store will be swapped for once step-1 numbers say
  the premise holds.
- **Capability intersection.** The delegation chain (agent → human) is recorded on
  every principal; enforcement of capability grants is deferred.
- **Web UI.** The Queue, Ledger and Tree are build-order steps 2–4.
- **`spec` field surfaces** (product decision D4) and **cross-tree links** (D5).
- **The one-tap "this didn't need me" affordance** on resolved escalations (the
  escalation-precision feedback signal) ships with the Queue in step 2; step 1's
  decision metrics are fan-out ratio and escalation latency.
- **Quiet-hours auto-delegation at creation time**: a mid-band escalation during
  quiet hours holds to digest; `auto_delegate_to` is honoured on `escalate_up`
  timeouts rather than at initial routing.

## Instrumentation for the step-1 gate

- **Fan-out ratio**: children per human-authored root — count `work_items` by
  `root_id` (in v0, `work_query` on the root returns the subtree).
- **Escalation latency by band**: `resolved_at - created_at` split by `routing`,
  persisted on every escalation.
