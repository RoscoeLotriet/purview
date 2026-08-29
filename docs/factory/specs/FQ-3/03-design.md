# FQ-3 · Gate 3 — Program design

Gate 2 approved as written 2026-08-29. CI filed separately.

## A finding that changes what gap 3 can claim

`PurviewService.notify` (`src/service/purview.ts:727-736`) swallows every bridge failure:

```ts
} catch (err) {
  // Delivery failure must never take down the write path; the escalation
  // is still in the store and the owner's queue.
  console.error('escalation bridge delivery failed:', err);
}
```

That is a defensible decision — a Slack outage should not fail an agent's write. But it is
also the mechanism behind gate 1's confound, and it is structural rather than accidental:
when Slack delivery fails, the escalation exists, no human ever sees it, the agent blocks
until timeout, and **the only trace is a line on stderr.** Nothing in the data model
distinguishes "delivered" from "silently dropped."

This narrows gate 1's claim, and I would rather narrow it here than have it discovered
later. The suite makes the failure **reproducible and pinned in a test**. It does not make
it **observable at runtime** — that needs a delivery outcome recorded on the escalation, a
`src/` change this issue forbids. So:

- Test 15 below pins the blind spot explicitly, as an assertion about today's behaviour.
- **A follow-up issue must be filed** for the runtime signal, and test 15 is the test that
  gets deliberately flipped when it lands. I will file it at gate 4 alongside the CI issue.

Without that follow-up, an operator reading bad step-1 numbers still cannot tell a broken
instrument from a bad premise. They can only now *reproduce* the broken instrument on demand.

## Files

**New — 12:**

```
tests/integration/harness/ports.ts
tests/integration/harness/wait.ts
tests/integration/harness/sign.ts
tests/integration/harness/slack-fake.ts
tests/integration/harness/purview.ts
tests/integration/harness/server-proc.ts
tests/integration/escalation-round-trip.integration.test.ts
tests/integration/bootstrap-config.integration.test.ts
tests/integration/slack-delivery.integration.test.ts
tests/integration/resources.integration.test.ts
tests/integration/concurrent-agents.integration.test.ts
tests/integration/restart-boundary.integration.test.ts
```

**Modified — 2:** `package.json` (scripts), `vitest.config.ts` (projects).

**Not modified:** anything under `src/`, any existing test, `tsconfig.json` (already includes
`tests/**/*.ts`), the lint config (already ignores `docs/`).

## Contracts — signatures only

### `harness/ports.ts`
```ts
/** Bind :0, read the assigned port, close. Racy by construction: the port is
 *  free when returned, not when used. Only for the child process, which cannot
 *  report a port it was not given. */
export function probeFreePort(): Promise<number>;
```

### `harness/wait.ts`
```ts
export interface WaitOptions { timeoutMs?: number; intervalMs?: number; label?: string }

/** Poll until `predicate` is truthy; reject with `label` in the message on deadline.
 *  Rejection text must name what was being waited for — a bare timeout in this
 *  suite is nearly impossible to diagnose. */
export function awaitCondition<T>(predicate: () => T | undefined, opts?: WaitOptions): Promise<T>;

/** Resolve when `promise` is still pending after `ms`. Used to assert an agent
 *  stays blocked — the only way to prove a *non*-release. */
export function stillPending(promise: Promise<unknown>, ms: number): Promise<void>;
```

### `harness/sign.ts`
```ts
export interface SignedForm { body: string; headers: Record<string, string> }

/** v0 signature over `v0:{timestamp}:{rawBody}`, matching src/slack/verify.ts. */
export function signSlackForm(rawBody: string, secret: string, timestampSec?: number): SignedForm;

export interface TapArgs {
  actionId: string;          // "resolve:<escalation_id>:<option_id>", read off the card
  userName: string;
  responseUrl: string;
}
/** Form-encoded `payload=<block_actions JSON>`, as Slack posts it. */
export function blockActionsForm(args: TapArgs): string;

/** Pull the action_id of the button whose label matches, from a recorded card. */
export function actionIdForOption(cardBody: unknown, optionLabel: string): string;
```

### `harness/slack-fake.ts`
```ts
export interface RecordedPost {
  url: string; headers: Record<string, string>; body: unknown; at: number;
}

export interface SlackFake {
  readonly origin: string;
  readonly webhookUrl: string;         // origin + "/webhook"
  responseUrl(id?: string): string;    // origin + "/response/<id>"
  readonly posts: readonly RecordedPost[];      // webhook deliveries
  readonly responses: readonly RecordedPost[];  // response_url deliveries
  /** Next request to any route answers with `status`. Provokes the failure path
   *  without touching src/. */
  failNext(status: number, body?: string): void;
  awaitPost(predicate?: (p: RecordedPost) => boolean, opts?: WaitOptions): Promise<RecordedPost>;
  awaitResponse(predicate?: (p: RecordedPost) => boolean, opts?: WaitOptions): Promise<RecordedPost>;
  /** Drains in-flight requests before closing; see gate 2 risk 5. */
  close(): Promise<void>;
}

export function startSlackFake(): Promise<SlackFake>;
```

### `harness/purview.ts`
```ts
export interface HarnessOptions {
  humanName?: string;
  signingSecret?: string | undefined;   // undefined = the unenforced deployment
  withSlack?: boolean;                  // false = no bridge at all
}

export interface PurviewHarness {
  readonly baseUrl: string;
  readonly slack: SlackFake;
  /** A connected MCP client identifying as `principal`. Tracked for teardown. */
  mcp(principal: string): Promise<Client>;
  /** Signed if the harness has a secret, unsigned if not. Returns the raw
   *  response — which per gate 2 proves nothing and must not be asserted on. */
  tap(form: string, signed?: boolean): Promise<Response>;
  /** Closes clients, calls service.shutdown() (real timers), closes both servers. */
  close(): Promise<void>;
}

export function startHarness(opts?: HarnessOptions): Promise<PurviewHarness>;
```

### `harness/server-proc.ts`
```ts
export interface ServerProcOptions {
  env: Record<string, string | undefined>;  // PORT is injected if absent
  port?: number;
}

export interface ServerProc {
  readonly port: number;
  readonly baseUrl: string;
  readonly stderr: readonly string[];
  /** SIGTERM, await exit, with a SIGKILL escape hatch on deadline. */
  stop(): Promise<void>;
}

/** Spawns the real entrypoint under tsx, resolving when it logs that it is
 *  listening. Retries once on EADDRINUSE (gate 2 risk 2). */
export function startServerProc(opts: ServerProcOptions): Promise<ServerProc>;
```

## Call stack — the main flow

The blocked-agent release, as it actually runs:

```
TEST                     client.callTool('work_escalate', { blocking: true })
  └ StreamableHTTPClientTransport.send        → HTTP POST /mcp
     └ app.post('/mcp')                        src/http/app.ts:29
        └ buildMcpServer(service, principal)   src/mcp/server.ts   ← new per POST
           └ StreamableHTTPServerTransport.handleRequest
              └ tool handler 'work_escalate'   src/mcp/server.ts:177
                 └ PurviewService.escalate     src/service/purview.ts:404
                    ├ store.putEscalation
                    ├ waiters.set(id, resolve)      :482-486   ← agent parks here
                    ├ notify(postEscalation)        :489
                    │  └ SlackBridge.postEscalation src/slack/bridge.ts:22
                    │     └ fetch(webhookUrl)       :55        ← real socket
                    │        └ SLACK FAKE records the card
                    └ scheduleTimeout(id, secs)     :491

TEST                     reads action_id off the recorded card
                         POST /slack/interactions (signed)
  └ app.post('/slack/interactions')            src/http/app.ts:67
     ├ verifySlackSignature                    src/slack/verify.ts
     ├ res.status(200).send('')                :91  ← acks BEFORE the work
     ├ parseInteraction                        src/slack/interactions.ts:14
     ├ PurviewService.resolveEscalation        src/service/purview.ts:500
     │  └ wake waiter                          :675  ← agent's promise resolves
     └ SlackBridge.postResolution              src/slack/bridge.ts:33
        └ fetch(response_url)                  ← SLACK FAKE records the replacement
```

The two arrows that matter: the agent parks at `:482` and wakes at `:675`, and everything
between them crosses a real socket twice. No existing test spans that.

## Test list

25 tests. Each line states what breaks it.

### Gap 1 — round trip (`escalation-round-trip.integration.test.ts`)

| # | Test | Proves / fails if |
|---|---|---|
| 1 | a blocked agent is released by a signed tap | The whole path. Fails if any hop breaks: waiter registration, card delivery, `action_id` encoding, signature acceptance, waiter wake, outcome shape. |
| 2 | the resolved card replaces the original at `response_url` | `postResolution` fires with `replace_original: true` and the resolved blocks. Fails if the bridge is not passed to `buildApp`, or `response_url` is dropped. |
| 3 | an **unsigned** tap does not release the agent | Signature enforcement gates *resolution*, not merely the response code. Uses `stillPending`. Fails if verification is bypassed while still returning 401. |
| 4 | a tap naming an unknown option leaves the escalation open | Option validation at the seam. Fails if an arbitrary `option_id` can resolve an escalation. |
| 5 | with no tap, the agent's call returns `resolution: 'timed_out'` and the timeout action | J5 end to end on real timers (`timeout_seconds: 1`). Fails if the timer never fires or the outcome is not branchable. |

### Gap 2 — bootstrap and configuration (`bootstrap-config.integration.test.ts`)

| # | Test | Proves / fails if |
|---|---|---|
| 6 | the real entrypoint serves `/healthz`, `/mcp` and `/slack/interactions` on `PORT` | The three surfaces are wired by the entrypoint, not only by `buildApp` in a harness. Fails on any wiring regression that unit tests structurally cannot see. |
| 7 | with `SLACK_SIGNING_SECRET` set, an unsigned interaction is rejected | The intended deployment enforces. |
| 8 | **with `SLACK_SIGNING_SECRET` unset, an unsigned interaction resolves an escalation** | Characterization of the open endpoint. Pins it as an explicit, undeniable fact rather than an omission. Must be deliberately flipped if the default ever changes. |
| 9 | with `SLACK_WEBHOOK_URL` unset the process starts and escalations still resolve | Log-only mode is a supported configuration, not a crash. |
| 10 | `PURVIEW_HUMAN` names the accountable human | Env → principal wiring. Fails if escalations route to `operator` regardless of config. |
| 11 | `SIGTERM` closes the listener and exits | Shutdown works — and is the precondition for test 25. |

### Gap 3 — Slack delivery (`slack-delivery.integration.test.ts`)

| # | Test | Proves / fails if |
|---|---|---|
| 12 | the card arrives as Block Kit with one button per option and `content-type: application/json` | The real outbound request shape over a socket. Fails if block rendering and delivery disagree — the two are separately tested today and never compared. |
| 13 | a Slack 500 on the card does **not** fail the agent's `escalate` call | Characterization of the deliberate swallow at `:727-736`. |
| 14 | after a Slack 500, the escalation is still resolvable and still releases the agent | Delivery failure does not corrupt state. |
| 15 | **a Slack 500 leaves no observable signal on the escalation** | The blind spot, asserted. The test the follow-up issue flips. See the finding above. |
| 16 | low-severity escalations batch into a digest rather than posting individually | Band routing reaches the bridge by a different path. |
| 17 | an already-resolved escalation renders in the digest as a fact with no buttons | The PR #1 verifier defect, re-pinned at integration altitude where it originally hid. |

### Gap 4 — resources (`resources.integration.test.ts`)

| # | Test | Proves / fails if |
|---|---|---|
| 18 | all four resources are readable by URI over HTTP | Resources work through the transport, not only the tool surface. |
| 19 | **`workitem://{id}/tree` resolves to the tree resource, not the bare item template** | The registration-order invariant that today exists only as a code comment ("More specific templates are registered before the bare item template"). Fails if anyone reorders the registrations. |
| 20 | `tree` honours `depth` and `attention_only` from the URI query | Template variable plumbing. Fails if the altitude query silently returns everything. |

### Gap 5 — concurrent agents (`concurrent-agents.integration.test.ts`)

| # | Test | Proves / fails if |
|---|---|---|
| 21 | two agents racing `work_claim` on one item: exactly one wins | Claim atomicity across interleaved requests. |
| 22 | concurrent `work_fan_out` against one budget never exceeds it | Budget enforcement is atomic. The fan-out ratio number depends on this being true under squad traffic. |
| 23 | each concurrent request's principal comes from its own header | A new protocol server per POST shares one service; a leak here would misattribute work to the wrong agent. Fails if principal is cached across requests. |
| 24 | two agents' blocking escalations resolve independently | The waiter map is keyed per escalation; one tap does not wake the wrong agent. |

*Scope note, per gate 2: these prove safety across `await` interleaving on one thread. Not
thread safety, not multi-process safety.*

### Gap 6 — restart boundary (`restart-boundary.integration.test.ts`)

| # | Test | Proves / fails if |
|---|---|---|
| 25 | work created before `SIGTERM` is absent after restart on the same port | Documents v0's stated limitation as an executable fact. This is the test the Postgres adapter must deliberately flip — its value is as a tripwire, not as a defect detector. |

## The three decisions I am least confident about

### 1. Spawning the real entrypoint as a child process (tests 6–11, 25)

It is the only way to cover the entrypoint without editing `src/`, and it is by a wide margin
the flakiest thing here: a free-port probe that is racy by construction, `tsx` startup
latency, stdout parsing to learn when it is listening, and orphaned processes when a test
fails before teardown. Seven of 25 tests depend on it.

The clean alternative is extracting config parsing into an exported function and testing it
in-process — a `src/` change this issue explicitly forbids.

**My position:** build it as specified, but treat flakiness as a design verdict rather than
something to paper over. If slice 1 needs retries or sleeps to stay green, the honest
conclusion is that the entrypoint is not testable as written, and the right response is to
file the `src/` refactor — not to add a retry and call it done. Worth your explicit
agreement now, because in the moment the retry will look much cheaper.

### 2. Whether test 25 earns its cost

It is close to tautological: `MemoryStore` obviously does not persist, so asserting that it
does not is asserting the name of the class. Its entire value is as a tripwire that must be
deliberately changed when durability lands — which depends on a future person reading it
that way. It costs a full stop/start cycle (~2–4 s of a ~20 s budget).

The cheaper in-process version (two apps over two stores) is *definitely* tautological and
worth nothing. So it is the expensive version or none.

**My position:** keep it, because gate 1 established that step 1 survives the readout and
therefore the Postgres adapter is a real future. If that changes, this is the first test to
cut.

### 3. Test 15 asserts the absence of a signal

Asserting a negative is structurally weak: it can pass because nothing broke, or because the
thing that would have surfaced a signal was never called. It is also guaranteed to need
changing when the follow-up lands — a test written to be deleted.

The alternative is to not write it, and let the follow-up issue carry the knowledge in prose.

**My position:** keep it, narrowly scoped to the escalation record's own fields rather than
"no signal anywhere," and comment it as a deliberate placeholder naming the follow-up issue.
Prose in an issue gets closed and forgotten; a failing assertion when someone adds the signal
is exactly the interruption we want. But this is the weakest of the 25 and I would drop it
without much argument.
