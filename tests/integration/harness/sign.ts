import { createHmac } from 'node:crypto';

export interface SignedForm {
  body: string;
  headers: Record<string, string>;
}

/** v0 signature over `v0:{timestamp}:{rawBody}`, matching src/slack/verify.ts. */
export function signSlackForm(rawBody: string, secret: string, timestampSec?: number): SignedForm {
  const timestamp = String(timestampSec ?? Math.floor(Date.now() / 1000));
  const hmac = createHmac('sha256', secret);
  hmac.update(`v0:${timestamp}:${rawBody}`);
  return {
    body: rawBody,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-slack-request-timestamp': timestamp,
      'x-slack-signature': `v0=${hmac.digest('hex')}`,
    },
  };
}

export interface TapArgs {
  /** "resolve:<escalation_id>:<option_id>", read off the card. */
  actionId: string;
  userName: string;
  responseUrl: string;
}

/** Form-encoded `payload=<block_actions JSON>`, as Slack posts it. */
export function blockActionsForm(args: TapArgs): string {
  const payload = {
    type: 'block_actions',
    user: { id: 'U0INTEGRATION', username: args.userName, name: args.userName },
    response_url: args.responseUrl,
    actions: [
      {
        type: 'button',
        action_id: args.actionId,
        value: args.actionId.split(':')[2] ?? '',
      },
    ],
  };
  return new URLSearchParams({ payload: JSON.stringify(payload) }).toString();
}

/** Only the parts of a Block Kit card this suite reads back. */
interface CardButton {
  action_id?: string;
  text?: { text?: string };
}
interface CardBlock {
  type?: string;
  elements?: CardButton[];
}

/** Pull the action_id of the button whose label matches, from a recorded card. */
export function actionIdForOption(cardBody: unknown, optionLabel: string): string {
  const blocks = (cardBody as { blocks?: CardBlock[] } | null | undefined)?.blocks ?? [];
  for (const block of blocks) {
    if (block.type !== 'actions') continue;
    for (const element of block.elements ?? []) {
      if (element.text?.text === optionLabel && element.action_id) return element.action_id;
    }
  }
  throw new Error(`recorded card has no button labelled "${optionLabel}"`);
}
