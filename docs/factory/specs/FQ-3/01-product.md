# FQ-3 · Gate 1 — Product

Source: https://github.com/RoscoeLotriet/purview/issues/3

## The problem, as a person's problem

The product spec §8 says: build step 1, point an agentic squad at it, read two numbers —
fan-out ratio and escalation latency — and **stop and look at the numbers before committing
to steps 2, 3 and 4.**

So one person is about to make a four-step build decision on the basis of two measurements.
The measurements come from the composed path: an agent hits a decision it cannot make, the
question reaches a human where they already are, the human answers in one tap, the agent
carries on. Every part of that path has been tested. **The path itself has never once been
run.**

That matters more than it sounds, because of how the failure presents. Product spec §7 says
escalation latency in the immediate band above ~10 minutes "reads as failure — routing isn't
working." Now consider a deployment where the Slack connection is simply misconfigured. No
crash, no error, no red anything. Escalations are still raised. Nobody ever sees them. They
all resolve by timeout at the half-hour mark. Latency reads as ~30 minutes and the timeout
rate goes vertical.

That is *exactly* the signature §7 tells the reader to interpret as "severity routing
doesn't work, this product's premise is wrong." A plumbing mistake and a dead product
premise produce the same dashboard.

**The person's problem: they cannot currently tell the difference between a negative result
and a broken instrument, and they are about to bet the next three build steps on being able
to.**

There is a second, smaller person here: whoever deploys this. Today, if the Slack signing
secret is left unset, the endpoint that resolves escalations accepts unsigned requests from
anyone who can reach it. It starts up clean and says nothing. Anyone on the internet can
answer questions addressed to the accountable human, and the transcript will attribute
their answers to that human.

## What success looks like, measurably

1. **Break the wiring, get a red test.** Deliberately sever the connection between any two
   of the three surfaces (agent-facing, Slack-facing, and the thing in the middle) and at
   least one test fails and names what broke. Measured by mutation probe at verification —
   not by counting tests.
2. **The two decision numbers come from a covered path.** When the step-1 readout happens,
   every hop that contributes to fan-out ratio and escalation latency has a passing
   end-to-end test behind it. Success is a sentence someone can say out loud: "the numbers
   are bad, and we know it isn't the plumbing."
3. **A misconfigured deployment is loud, not silent.** The specific silent failures known
   today — unset Slack connection, unset signing secret — are each pinned by a test that
   states the current behaviour as a fact. Whether that behaviour then changes is a separate
   decision; this gate only requires it stop being invisible.
4. **Diagnosis time drops.** Today a dropped escalation means reading three modules and
   guessing. Target: one named failing test.
5. **The fast suite stays fast.** Whatever gets added, the everyday run does not get slower.
   Integration work is separately invocable.

## Announcement, as if it already shipped

> **Step 1 now has an end-to-end safety net.**
>
> Purview's first slice has always had good tests, but they tested the parts, not the
> product. As of today there's a suite that runs the whole thing: a real agent client
> raises a real escalation over the real transport, a card lands on a real (fake) Slack
> endpoint, a signed tap comes back, and the blocked agent wakes up with the answer — all in
> one test, the way it happens in production.
>
> The reason this exists is not tidiness. We're about to read two numbers off step 1 and
> decide whether to build the other three steps. A misconfigured Slack connection produces
> exactly the same dashboard as a failed product premise: escalations timing out, latency
> through the floor. We'd have read that as "the idea doesn't work."
>
> Now we can tell those apart. If the numbers come back bad, we'll know it's the idea.

## Screens

The suite adds no screen. Step 1 has exactly one human-facing surface — the Slack escalation
card — and `mockups/escalation-card.html` renders its three states as the tests will assert
them. It documents existing behaviour rather than proposing new behaviour, and exists so the
approver can see what "the human answers in one tap" actually looks like before approving
tests that pin it.

## What we are deliberately not doing

- **Not testing against Slack's real API.** A local fake only. Real Slack in CI buys
  flakiness and a secret, and proves something we don't control.
- **Not testing durability or Postgres.** No adapter exists yet. The suite will pin today's
  documented "state does not survive a restart" as a fact, so the future adapter arrives
  with a test to flip — but it does not build for a database that isn't here.
- **Not load or performance testing.** Fan-out ratio and escalation latency are read from
  real traffic. This suite proves the path works; it does not assert what the numbers are.
- **Not changing production code.** Every gap is existing behaviour that was never covered.
  If something can't be tested without a production change, that's a finding to file, not a
  licence to edit.
- **Not touching existing tests.** Charter §3. New files only.
- **Not building for steps 2–4.** No web UI exists to test.
- **Not chasing a coverage number.** Six named gaps. Coverage percentage is not a goal and
  will not be reported as one.
- **Not verifying the metrics are *meaningful*.** The suite proves the instrument is wired
  correctly. Whether fan-out ratio is the right thing to measure is a product question and
  §7 already owns it.

## The kill question

The honest case against doing this at all:

> Step 1 is a disposable probe. Its own spec says stop and look at the numbers. If the
> numbers say no, all of it gets deleted — and integration tests on code you're about to
> delete are the definition of waste. Ship it, point agents at it, read the numbers.

That argument is good, and it is wrong in one specific way: it assumes a bad number means a
bad idea. The whole point above is that right now it doesn't mean that, and can't be made to
mean that after the fact. You cannot retroactively determine whether last month's timeouts
were Slack or severity. **Testing the instrument before taking the measurement is not
gold-plating the throwaway — it is the only thing that makes the throwaway's output usable.**

But the argument does have a real edge, and it should bite on scope. Ranked by what actually
protects the decision:

| Gap | Protects the readout? | Verdict if step 1 might be deleted |
|---|---|---|
| End-to-end escalation round trip | **Yes** — it *is* the latency path | Do it |
| Silent misconfiguration (Slack unset, signing secret unset) | **Yes** — the exact confound above | Do it |
| Slack delivery failure modes | **Yes** — a dropped card is an invisible timeout | Do it |
| Concurrent agents over the shared graph | Partly — fan-out ratio under real squad traffic | Probably |
| Reading the four data resources | No — nothing in the readout depends on them | Defer |
| Restart / persistence boundary | No — it documents a v0 limitation | Defer |

**Recommendation: approve the problem, and cut the last two gaps** unless the answer to
"will step 1 survive regardless of the numbers?" is yes. That drops the suite from six gaps
to four and makes the slice plan meaningfully smaller.

## Open question for the approver

**Is step 1's code going to survive a decision not to build steps 2–4?**

- If **yes** (it becomes the foundation regardless), all six gaps are worth it.
- If **no** (a bad readout means delete), cut gaps 5 and 6 as above.

Everything downstream — how many slices, how much harness — turns on this answer, which is
why it is at gate 1 rather than gate 4.
