# FQ-3 · Gate 2 — Architecture

Gate 1 approved 2026-08-29, all six gaps. Step 1 survives regardless of the readout, so the
restart boundary and the resource surface are in scope.

## The decision that shapes everything else

**There is no CI.** `.github/workflows/` does not exist. The entire enforcement boundary is
the factory gates script run locally, and its `test` gate is exactly one line:

```
if pkg_has test; then run test $PMRUN test; else skip test "no test script"; fi
```

It runs `pnpm test` and nothing else. So the obvious layout — `pnpm test` stays unit-only,
integration lives behind `pnpm test:integration` — would produce **a suite that never runs
in any gate**. It would exist, be green, and gate nothing. That is worse than not writing
it, because it looks like coverage.

Inverting the usual split:

| Script | Runs | Purpose |
|---|---|---|
| `pnpm test` | unit **+ integration** | what the gates script invokes; the enforcement path |
| `pnpm test:unit` | unit only | the tight edit loop |
| `pnpm test:integration` | integration only | debugging this suite |

Gate 1's success criterion 5 ("the fast suite stays fast") is met by `test:unit` existing,
not by integration being excluded from the default. **The default must be the slow, complete
one** — a developer choosing speed is a choice; a gate silently skipping is a hole.

Implemented with vitest projects in `vitest.config.ts`, so the two suites keep separate
`include` globs and the integration project can pin its own pool and timeout settings
without affecting the fast suite.

## Modules touched

Nothing under `src/` is modified. Read-only consumption of:

| Module | How the suite reaches it |
|---|---|
| `src/http/app.ts` | `buildApp(service, opts)` — real Express app on an ephemeral port |
| `src/mcp/server.ts` | over the wire only, via a real MCP `Client`; never constructed directly |
| `src/service/purview.ts` | never called directly from a test body — only through a surface |
| `src/slack/bridge.ts` | real `SlackBridge` pointed at a fake Slack origin |
| `src/store/memory.ts` | constructed by the harness; never asserted against directly |
| `src/server.ts` | spawned as a child process (gaps 2 and 6) |

**The one rule that makes these integration tests rather than slow unit tests: a test body
may not call a service method.** It drives the system only through `/mcp`,
`/slack/interactions`, `/healthz`, or a child process's env. Assertions read from the MCP
client, the fake Slack's recorded traffic, or the process's behaviour. The harness may
construct, but never assert.

## New structures

No production types. The harness surface, in shape:

```
tests/integration/harness/
  purview.ts     boot the real app; returns { baseUrl, mcp(principal), slack, close }
  slack-fake.ts  recording Slack origin: webhook + response_url routes
  sign.ts        Slack v0 request signing + block_actions payload construction
  wait.ts        awaitCondition / awaitRequest — polling with a deadline
  server-proc.ts spawn the real entrypoint with env; wait for listen; SIGTERM; restart
```

Shapes:

- `PurviewHarness` — `{ baseUrl: string; slack: SlackFake; mcp(principal: string): Promise<Client>; close(): Promise<void> }`. `close()` closes every MCP client it handed out, calls `service.shutdown()` (escalation timers are real, and cleanup is not automatic), then closes both HTTP servers.
- `SlackFake` — `{ origin: string; webhookUrl: string; posts: RecordedPost[]; responses: RecordedPost[]; failNext(status: number): void; awaitPost(pred): Promise<RecordedPost> }`. `failNext` is how gap 3 provokes the delivery-failure path without touching `src/`.
- `RecordedPost` — `{ url: string; headers: Record<string,string>; body: unknown; at: number }`.

`response_url` is not a real Slack URL here: the test constructs the `block_actions` payload,
so it points `response_url` at the fake's own `/response/:id` route. That is what makes the
in-place card update observable.

## End-to-end call flow — the tracer scenario

Numbered because the ordering is the assertion:

1. Fake Slack listens on an ephemeral port → `webhookUrl`.
2. Harness builds `MemoryStore` → `SlackBridge({ webhookUrl })` → `PurviewService({ store, bridge, humanName })` → `buildApp(service, { signingSecret, slackBridge: bridge })` → `listen(0)` → `baseUrl`.
3. MCP `Client` connects over `StreamableHTTPClientTransport(new URL(baseUrl + '/mcp'))` with `requestInit.headers['x-purview-principal'] = 'scout'`.
4. `work_create` → `work_claim`.
5. `work_escalate` with `blocking: true, timeout_seconds: 5`. **The test holds this promise unresolved.** This is the agent blocked at `src/service/purview.ts:482-486`.
6. The service posts the card: real `fetch` from `SlackBridge` to the fake. The fake records it.
7. The test reads the `action_id` out of the recorded Block Kit payload — `resolve:<escalation_id>:<option_id>` — which is the only place the escalation id crosses the seam. Parsing it *from the card* rather than from the tool result is deliberate: it proves the card carries a resolvable identity.
8. The test form-encodes a `block_actions` payload with that `action_id` and a `response_url` on the fake, signs it v0, POSTs to `/slack/interactions`.
9. The endpoint acks 200 **before doing the work** (`src/http/app.ts:91` — "Acknowledge fast; Slack expects a response within 3 seconds").
10. Resolution wakes the waiter; the held promise from step 5 resolves with the chosen option.
11. `postResolution` fires at the fake's `response_url`; the fake records a `replace_original: true` card.

**Consequence of step 9, and the single biggest flakiness trap in this suite: no assertion
may be made on the interaction POST's own response.** It returns 200 before anything has
happened. Every assertion must await either the agent's held promise (step 10) or a
recorded request at the fake (step 11). Hence `awaitCondition` in the harness — and hence
the rule that this is the *first* slice, because getting this wrong quietly makes every
later slice flaky.

## Timers

**Real timers throughout; no fake timers.** Escalation timeouts are parameterised
(`timeout_seconds`), so a J5 timeout test passes `1` and waits ~1s rather than mocking the
clock. Digest cadence in the child process comes from `DIGEST_INTERVAL_MS`.

Fake timers cannot be mixed with real sockets without either freezing the HTTP stack or
leaking unfaked timers, and the existing unit suite already covers the timeout logic with
fake timers. Duplicating that at integration altitude would test vitest, not Purview. Cost:
a few seconds of real waiting, in the integration project only.

## External dependencies

**Zero new dependencies.** Each candidate, and why not:

| Candidate | Verdict |
|---|---|
| `StreamableHTTPClientTransport` | Already present in `@modelcontextprotocol/sdk`. Required — it is the only way to be a real client. |
| `node:http` for the fake Slack | Built in. Chosen over Express to keep the fake's behaviour obvious. |
| `nock` / `msw` | **Rejected.** Both intercept `fetch` rather than serve it. Gap 3 exists to prove real outbound HTTP works, including a non-2xx response; an interceptor would prove the interceptor works. |
| `supertest` | Rejected. Binds the app without a real socket; the tracer scenario needs a real origin the service can `fetch`. |
| `testcontainers` | Not applicable. No database in v0. |
| `execa` | Rejected. `node:child_process` is enough for one spawn. |

`tsx` is already a devDependency and is what the child process is spawned with.

## LOAD_BEARING paths

**None.** Charter §2 globs against the file list:

| Glob | Touched? |
|---|---|
| `src/auth/**`, `src/payments/**` | no such directories |
| `**/migrations/**`, `**/*.sql` | the durable schema file is read by nobody here and unmodified |
| `.github/workflows/**` | **does not exist and this spec does not create it** — see the open question |
| factory policy and harness paths, `AGENTS.md` | untouched |

Files modified outside `tests/`: `package.json` (scripts) and `vitest.config.ts` (projects).
`tsconfig.json` already includes `tests/**/*.ts`, so new integration files typecheck with no
config change, and the lint config already ignores `docs/`, so this spec and its mockups are
not linted.

Because no load-bearing path is involved, the `factory-critic` pass this gate mandates for
load-bearing work is **not triggered**. It is available on request; my read is that the
argument most worth stress-testing is the `pnpm test` inversion above, and that one is
better settled by you than by another model.

Charter §3 (`TESTS_ARE_LOAD_BEARING: true`) applies but is satisfied: every file is new.

## What could break elsewhere

Ranked by likelihood of actually biting:

1. **Every future gate run gets slower.** `pnpm test` is on the critical path of every factory item forever. Budget: integration under ~20s wall clock. If it drifts past that, the right fix is deleting a test, not moving it out of the default.
2. **Port collisions under parallel workers.** Ephemeral ports (`listen(0)`) are safe. The child-process tests are not: the entrypoint reads `PORT` and logs the *configured* value, so `PORT=0` yields a useless `:0` in the log and no way to learn the real port. The harness must probe a free port, close it, then pass it — a TOCTOU race that is small but real. Mitigation: the integration project pins the child-process files to a single worker and retries once on `EADDRINUSE`.
3. **Leaked child processes hang the run.** A test that fails before teardown leaves a `tsx` process holding a port. Mitigation: spawn with `detached: false`, kill in `afterEach` inside a `finally`, and register a process-level cleanup.
4. **Leaked escalation timers hang vitest.** A blocking escalation that is never resolved keeps a timer alive; `service.shutdown()` is the only cleanup and the harness must always call it. PR #1's verifier already caught one instance of this class.
5. **Unhandled rejections from a mid-flight fake.** Closing the fake Slack while `postResolution` is in flight surfaces as an unhandled rejection that vitest attributes to whichever test runs next. Mitigation: the fake drains in-flight requests before closing.
6. **A green suite that proves less than it looks.** Node is single-threaded; the gap-5 "concurrent agents" tests prove safety across `await` interleaving, **not** thread safety or multi-process safety. Stated here so nobody later reads them as proof of the latter.

## Open architecture question

**Should this spec also create a CI workflow?**

Right now the gates script only runs when someone runs it. A suite whose purpose is catching
a misconfiguration nobody noticed is worth more when a machine runs it on every push. But
`.github/workflows/**` is load-bearing under Charter §2 — creating it forces `deep` gates and
a human read, and it is arguably a separate concern from this issue.

My recommendation: **out of scope here, file it separately.** This spec is already four
slices; bundling a load-bearing path into it would raise every slice's gate level. But it
should be filed today rather than noticed in six months, and I'll do that at gate 4 if you
agree.
