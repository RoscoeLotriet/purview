# FQ-3 · Gate 3 amendment 1 — decouple the harness from the Slack fake

Gate 3 was approved 2026-08-29. This amendment reopens exactly one contract in it, the
`harness/purview.ts` block. Nothing else in `03-design.md` changes: same 25 tests, same call
flow, same file list, same dependency policy, same three low-confidence decisions.

**Why it reopens at all:** slice 0 as approved measured 515 lines against a 400 ceiling. The
harness cannot be cut in half because `harness/purview.ts` imports `sign.ts` and
`slack-fake.ts` and `startHarness` starts the fake unconditionally
(`purview.ts:8-9,63`). Decoupling the fake is what makes two reviewable slices possible.

## The change

### Before (approved 2026-08-29)

```ts
export interface HarnessOptions {
  humanName?: string;
  signingSecret?: string | undefined;   // undefined = the unenforced deployment
  withSlack?: boolean;                  // false = no bridge at all
}

export interface PurviewHarness {
  readonly baseUrl: string;
  readonly slack: SlackFake;
  mcp(principal: string): Promise<Client>;
  tap(form: string, signed?: boolean): Promise<Response>;
  close(): Promise<void>;
}
```

### After

```ts
// harness/purview.ts — slice 0a. Imports ports.ts and wait.ts only.
export interface HarnessOptions {
  humanName?: string;
  signingSecret?: string | undefined;   // undefined = the unenforced deployment
  /** The fake Slack to deliver cards to. Omit for the log-only deployment
   *  (no SlackBridge constructed) — supported per test 9, and what slice 0a
   *  exercises. Injected rather than started here so this module does not
   *  depend on slack-fake.ts. */
  slack?: SlackFake;
}

export interface PurviewHarness {
  readonly baseUrl: string;
  /** Present only when `opts.slack` was supplied. */
  readonly slack: SlackFake | undefined;
  mcp(principal: string): Promise<Client>;
  close(): Promise<void>;
}

export function startHarness(opts?: HarnessOptions): Promise<PurviewHarness>;
```

`SlackFake` is imported as a **type only** (`import type`), so `purview.ts` carries no
runtime dependency on `slack-fake.ts` and slice 0a compiles without it.

### `tap()` moves out of the harness

```ts
// harness/tap.ts — slice 0b. New file.
export interface TapOptions {
  signed?: boolean;
  signingSecret?: string | undefined;
}
/** POSTs a form to /slack/interactions. Per gate 2 the response proves nothing
 *  and must not be asserted on — it acks before doing any work. */
export function tap(baseUrl: string, form: string, opts?: TapOptions): Promise<Response>;
```

`close()` closes the MCP clients, calls `service.shutdown()` on real timers, and closes the
Purview listener. It no longer closes the fake Slack — whoever started the fake owns closing
it. Test files that inject a fake close it in their own `afterEach`.

## The constraint that forced `tap()` out, which you should rule on separately

`tap()` needs `signSlackForm` from `sign.ts`, which lands in slice 0b. If `tap()` stayed on
`PurviewHarness`, **slice 0b would have to modify `harness/purview.ts`, a file slice 0a
created.**

Whether that is allowed is an open charter question, filed by triage on PR #15 and still
unresolved: does Charter §3's "existing test file" rule cover non-`*.test.ts` helpers under
`tests/`? It is no longer academic —

- Under a strict reading, an unattended slice 0b may not touch `purview.ts` at all.
- **The already-approved slice 1 has the same problem**: it "extends
  `escalation-round-trip.integration.test.ts`", a file slice 0b creates. That is a
  `*.test.ts` file, so it is caught by §3 under *any* reading. Slice 1 as approved cannot
  run unattended.

This amendment resolves it by design rather than by waiver: **every FQ-3 slice adds files
and never modifies another slice's files.** That is why `tap()` becomes a free function in
its own module instead of a method. Gate 4 applies the same rule to slice 1.

The alternative is a charter ruling that §3 protects only files predating the spec. That is
yours to make and this amendment does not assume it. The design route needs no waiver, and
the cost is small: one extra module and slightly more explicit test setup.

## What this does not change

- No change to any of the 25 tests in the gate-3 test list, or what each proves.
- No change to the call stack for the main flow.
- No new dependencies. `tap.ts` is `fetch` plus `sign.ts`.
- No change to the "harness may construct, a test body may not call a `PurviewService`
  method" rule.
- No change under `src/`.

## Cost of being wrong

If injection turns out to be awkward, the fallback is the un-decoupled harness with a
charter waiver for the 515-line slice — which is where we already are, so the amendment
risks nothing that is not already on the table.

---

**STOP — gate 3 amendment awaiting approval.** Gate 4 is drafted against it but is a
separate approval.
