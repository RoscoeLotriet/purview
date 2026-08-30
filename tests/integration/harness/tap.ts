import { signSlackForm } from './sign.js';

export interface TapOptions {
  /** Sign the form. Defaults to true when a `signingSecret` is available. */
  signed?: boolean;
  /** Explicit `undefined` taps the deployment that does not enforce signatures. */
  signingSecret?: string | undefined;
}

/**
 * POSTs a form to `/slack/interactions`.
 *
 * A free function rather than a method on `PurviewHarness` (gate 3 amendment 1):
 * it needs `sign.ts`, which lands in this slice, and leaving it on the harness
 * would force this slice to modify a file slice 0a created.
 *
 * Per gate 2 the returned response proves nothing and must not be asserted on —
 * the route acks before doing any work, to stay inside Slack's 3-second rule.
 */
export function tap(baseUrl: string, form: string, opts: TapOptions = {}): Promise<Response> {
  const { signingSecret } = opts;
  const shouldSign = opts.signed ?? Boolean(signingSecret);
  const headers: Record<string, string> = {
    'content-type': 'application/x-www-form-urlencoded',
  };
  if (shouldSign && signingSecret) {
    Object.assign(headers, signSlackForm(form, signingSecret).headers);
  }
  return fetch(`${baseUrl}/slack/interactions`, { method: 'POST', headers, body: form });
}
