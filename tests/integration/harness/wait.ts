export interface WaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
  label?: string;
}

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_INTERVAL_MS = 10;

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll until `predicate` is truthy; reject with `label` in the message on
 * deadline. Rejection text must name what was being waited for — a bare
 * timeout in this suite is nearly impossible to diagnose.
 */
export async function awaitCondition<T>(
  predicate: () => T | undefined,
  opts: WaitOptions = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
  const label = opts.label ?? 'an unnamed condition';
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = predicate();
    if (value) return value;
    if (Date.now() >= deadline) {
      throw new Error(`timed out after ${timeoutMs}ms waiting for ${label}`);
    }
    await sleep(intervalMs);
  }
}

/**
 * Resolve when `promise` is still pending after `ms`. Used to assert an agent
 * stays blocked — the only way to prove a *non*-release.
 */
export async function stillPending(promise: Promise<unknown>, ms: number): Promise<void> {
  const settled = Symbol('settled');
  // Attach both handlers now so a later rejection is never unhandled.
  const outcome = promise.then(
    () => settled,
    () => settled,
  );
  const pending = sleep(ms).then(() => undefined);
  if ((await Promise.race([outcome, pending])) === settled) {
    throw new Error(`expected the call to still be blocked after ${ms}ms, but it settled`);
  }
}
