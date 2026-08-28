# Purview — Product Spec

Draft v0.1 · Companion to `purview-spec.md` (schema & MCP surface)

Read this document first, then the technical spec. This one decides *what* is being
built and, more importantly, what is not. The technical spec decides how.

> **Naming.** Purview is a working name only. Microsoft Purview is an established
> data governance, security and compliance platform sold to the same enterprise
> buyers this product would eventually target. The name will not survive to launch
> and should not be used in any external material.

---

## What this is

Purview is a work tracker for teams where most of the work is done by agents. A human
writes a goal in plain language; agents decompose it, execute it, and record state
through an MCP interface as a byproduct of the calls they are already making — so the
tracker stays current without anyone maintaining it. What that produces is a work tree
growing faster and wider than any person can read, which means the substance of the
product is the read side: healthy work collapses out of view, only blocked, failed,
over-budget and approval-pending items surface upward, and the interruptions that
genuinely need a human are routed against a budget of that human's attention rather
than fired at will. It does not run agents and it is not a chat tool. It sits beside
execution that already happens elsewhere and answers one question for the person who
will be held responsible: is anything wrong, and does anything need me.

---

## 1. Problem

Project trackers have always decayed because they depend on humans doing bookkeeping
after the work is done. Chat tools have the opposite failure: state is implicit in a
linear feed that nobody can reconstruct.

Agents change the economics of both. An agent is already making an API call to do the
work, so recording the state costs nothing extra. But agents also produce work at a
rate and volume no human feed can absorb — one human-authored goal fans out into
dozens of machine-authored sub-tasks within minutes.

So the problem this product solves is not "track work." It is:

> **A human is accountable for a body of work that is being executed faster than they
> can read. How do they stay accountable without reading it?**

The answer this product commits to: they read almost none of it, and the system is
responsible for surfacing exactly the exceptions that need them.

---

## 2. Who it is for

**v1 target user: an engineering leader or operator running agentic delivery in a
setting where someone will eventually ask what happened and why.** Regulated or
near-regulated environments make the accountability requirement concrete rather than
aspirational.

### Personas

**The Accountable (primary).** Owns outcomes across many concurrent goals. Cannot and
should not read the tree. Needs to know: is anything red, does anything need me, are
we within budget. Reads on a phone as often as a laptop. Success for this person is
looking at the product for ninety seconds and closing it.

**The Operator (secondary).** Owns one or two goals in depth. Drills into the tree,
resolves blockers, reviews artifacts, corrects agents that have gone sideways. This is
the person who actually opens a work item and reads a transcript.

**The Agent (participant, not user).** Interacts only through MCP. Never sees a UI.
Needs deterministic, low-latency answers to "what should I do about this" and must
never be left stalled indefinitely.

**The Auditor (deferred, v2).** Reconstructs after the fact: what did this agent see,
who approved it, could we have caught it. v1 must not foreclose this — the transcript
and provenance model exists for them — but no auditor-facing surface ships in v1.

---

## 3. Decisions taken

These resolve open questions from the technical spec. Treat them as settled for the
purposes of implementation.

**D1. Humans do not author sub-items in v1.** A human writes a root intent. Everything
below it is created by agents. Humans can abandon, re-prioritise, or add a note to any
item, but there is no create-child affordance in the UI. Consequence: authoring is a
text box, and effectively the whole build budget goes into the read surface. If this
proves wrong it is cheap to reverse, because the schema already supports it.

**D2. The product does not run agents.** It records, gates and routes them. Execution
stays wherever it already is — Claude Code, a CI runner, someone's harness. This keeps
the surface area small and means adoption does not require changing how anyone
executes.

**D3. Slack is the v1 delivery channel, not a competitor.** Escalations render into
Slack with option buttons. Nobody is asked to migrate. The web surface is where the
work graph lives; Slack is where interruptions land.

**D4. `spec` is not exposed in v1.** `intent` plus transcript is sufficient until
something is actually machine-checking acceptance criteria. The field stays in the
schema, unused by the UI.

**D5. Strict tree, no cross-links.** No `blocks` / `blocked_by` edges in v1. This will
eventually be wrong; accept it, because every rollup rule doubles in complexity the
day the graph stops being a tree.

---

## 4. Surfaces

Four screens. If a fifth appears during implementation, that is a signal something has
been mis-scoped.

### 4.1 The Ledger — root view

The landing surface. One row per root intent.

Each row shows: intent (truncated), attention badge, open/total descendant count,
budget consumed as a proportion, earliest deadline, last-activity timestamp.

Sort order is fixed and not user-configurable in v1: attention flag first
(`approval` → `failed` → `blocked` → `over_budget`), then earliest deadline, then last
activity. The ordering *is* the opinion. Letting users re-sort undermines it.

A healthy Ledger is boring. If every row has a badge, either the system is
mis-calibrated or the org has bigger problems than tooling.

### 4.2 The Tree — drill-down

Opened from a Ledger row. This is the hardest surface and the one that differentiates
the product.

Default view is **attention-only**: render the path from root down to every flagged
descendant, and nothing else. Healthy siblings collapse into an inline count
(`+14 done`, `+3 running`) that expands on tap.

An altitude control sets maximum render depth. Changing it re-queries rather than
filtering client-side, because subtrees will be large.

Rules that hold at every altitude:

- A collapsed group never hides a flagged item. Ever. If it is flagged, it is on
  screen or it is on a visible path to something on screen.
- Completed work is visible only by explicit expansion.
- The badge on a collapsed group reflects the worst state inside it.

### 4.3 The Item — detail

Intent, current state and reason, owner, blast radius, budget consumed, artifacts.

Below that, the transcript. Filter chips by entry kind, defaulting to **everything
except `tool_call`** — tool calls will be 90%+ of entries by volume and are diagnostic
material, not narrative. Provenance is a separate tab, not inline.

Human actions available here: add a note, abandon with reason, reassign owner,
adjust priority on the root. Nothing else. This is deliberately not a place where a
human can hand-edit agent state.

### 4.4 The Queue — personal, mobile-first

Escalations routed to me, then items I own. This is the surface that gets checked from
a phone, and it is the one to design for first even though it is the simplest.

An escalation card shows: the question, the `context_summary`, and the options as
buttons. Optional free-text field, collapsed by default. One tap resolves it.

Hard constraint: **an escalation must be resolvable without opening the item.** If a
human needs more context than `context_summary` provides in order to answer, the
escalation was badly formed and the server should have rejected it at creation.

### 4.5 The Digest — not a screen

Low-severity escalations and a summary of state changes, batched and delivered on a
cadence (default: twice daily, per user timezone, never during quiet hours). Delivered
to Slack. Each item is resolvable inline from the digest.

---

## 5. Core journeys

**J1. Delegate a goal.** Accountable writes an intent, sets priority, blast radius
ceiling and budget. Item enters `ready`. An agent claims it. Human closes the tab.

**J2. Stay accountable passively.** Accountable opens the Ledger once or twice a day.
Scans badges. Ninety seconds. Closes it. This is the modal interaction and it should
feel almost empty.

**J3. Resolve an interrupt.** Agent hits an irreversible action. Escalation computed
above threshold, pushed immediately to Slack. Human reads three lines on a phone, taps
an option. Agent unblocks within seconds. This is the journey the product lives or
dies on.

**J4. Investigate a failure.** Something is red on the Ledger. Operator opens the Tree
in attention-only mode, lands directly on the failed leaf, reads the transcript and
the state reason, and either abandons the branch or adds a corrective note and
reassigns.

**J5. Get overruled by time.** Nobody answers an escalation before `timeout_at`. The
declared `timeout_action` fires. The item records the timeout as a decision with no
human author, and it appears in the digest as a fact, not a request. Nothing is
silently lost.

---

## 6. Non-goals

Explicit, because scope creep here is fatal and each of these will feel reasonable
when someone asks for it.

- **Not a chat app.** No DMs, no channels, no presence, no human-to-human threading
  beyond notes attached to an item.
- **Not a project management tool.** No sprints, estimates, velocity, burndown,
  capacity planning, or roadmaps.
- **Not an agent runtime.** No execution, no scheduling, no model routing, no prompt
  management.
- **No workflow builder.** No user-defined states, no custom fields, no automation
  rules in v1. The state machine is fixed and opinionated.
- **No native mobile app.** Responsive web plus Slack covers it.
- **No dashboards or reporting.** The Ledger is the report.
- **No integrations beyond Slack and MCP.**

---

## 7. What "working" looks like

Two of these come from the technical spec because they test the premise rather than
the product. All five should be instrumented from the first deployment.

| Metric | Definition | Reads as failure if |
| --- | --- | --- |
| Fan-out ratio | Children created per human-authored root | Below ~5 — the tree isn't earning its complexity and this is a Linear feature |
| Escalation latency by band | Time to resolution, split by severity band | Immediate band above ~10 min — routing isn't working |
| Attention efficiency | Proportion of all work items a human ever views | Above ~10% — humans are still reading the tree |
| Escalation precision | Proportion of `immediate` escalations the human retrospectively marks as warranting interruption | Below ~70% — severity is mis-calibrated and trust will erode |
| Timeout rate | Proportion of escalations resolving by `timed_out` | Above ~15% — either routing is failing or the budget is too tight |

Escalation precision needs a one-tap "this didn't need me" affordance on resolved
escalations to be measurable. Build it in v1; it is the feedback signal that makes the
severity weights tunable rather than guessed.

---

## 8. Build order

1. **Schema, MCP server, Slack escalation bridge.** No web UI. Point an existing
   agentic squad at it and let it run. This alone tests fan-out ratio and escalation
   latency, which are the two numbers that decide whether to continue.
2. **The Queue.** Mobile-first. Escalation resolution moves out of Slack and into the
   product.
3. **The Ledger.** The passive accountability surface.
4. **The Tree.** Last, because it is the most work and the least used, and because by
   this point real subtree shapes will inform the collapse behaviour rather than
   guesses about it.

Stop after step 1 and look at the numbers before committing to the rest.

---

## 9. Known risks

**Linear ships a version of this.** They have the graph, the design velocity and
existing distribution. The defensible parts are fan-out handling and severity-based
interrupt routing, neither of which is a small bolt-on to a human-speed tracker. Speed
to real agent traffic matters more than polish.

**Severity calibration is the whole product and it is guessed.** The weights in §3 of
the technical spec are placeholders. If immediate escalations are noisy, humans mute
them, and the product is dead the week that happens. Escalation precision is therefore
the metric to watch above all others.

**Agents underuse the MCP surface under context pressure.** If reporting is optional
from the agent's point of view, it will be skipped. Mitigation is that the tools map
onto things the agent needs anyway — `escalate` to unblock, `query` to hydrate context
— rather than bookkeeping. Watch for items that go `running` and never report again.

**D1 may be wrong.** If Operators immediately want to author sub-items, the read-only
tree becomes an obstruction rather than a simplification. Cheap to reverse; watch for
it in the first weeks of real use.
