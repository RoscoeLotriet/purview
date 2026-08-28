import { createHmac, timingSafeEqual } from 'node:crypto';

const REPLAY_WINDOW_SECONDS = 300;

export interface VerifyArgs {
  signingSecret: string;
  /** `x-slack-request-timestamp` header, seconds since epoch. */
  timestamp: string;
  /** The raw, unparsed request body. */
  rawBody: string;
  /** `x-slack-signature` header, `v0=<hex>`. */
  signature: string;
  now?: Date;
}

/** Slack v0 request signing, with a replay window and a timing-safe compare. */
export function verifySlackSignature(args: VerifyArgs): boolean {
  const now = args.now ?? new Date();
  const ts = Number(args.timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(now.getTime() / 1000 - ts) > REPLAY_WINDOW_SECONDS) return false;

  const hmac = createHmac('sha256', args.signingSecret);
  hmac.update(`v0:${args.timestamp}:${args.rawBody}`);
  const expected = Buffer.from(`v0=${hmac.digest('hex')}`);
  const provided = Buffer.from(args.signature);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
