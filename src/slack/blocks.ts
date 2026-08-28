import type { Escalation, WorkItem } from '../domain/types.js';

/** Minimal Block Kit shape; Slack tolerates extra fields, we type only what we read. */
export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

export const RESOLVE_ACTION_PREFIX = 'resolve';

function bandLabel(e: Escalation): string {
  const pct = Math.round(e.severity * 100);
  return `${e.routing} · severity ${pct}% · ${e.kind}`;
}

/**
 * The J3 card: question, context_summary, one button per option. Must be
 * resolvable from a lock screen without opening the item.
 */
export function escalationBlocks(e: Escalation, item: WorkItem): SlackBlock[] {
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${e.question}*` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: e.context_summary },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `${bandLabel(e)} · ${item.intent} · \`${item.id}\`` }],
    },
    {
      type: 'actions',
      elements: e.options.map((o) => ({
        type: 'button',
        text: { type: 'plain_text', text: o.label },
        action_id: `${RESOLVE_ACTION_PREFIX}:${e.id}:${o.id}`,
        value: o.id,
      })),
    },
  ];
}

/** Replaces the card once resolved: outcome as fact, no buttons. */
export function resolvedBlocks(e: Escalation): SlackBlock[] {
  const chosen = e.options.find((o) => o.id === e.chosen_option_id)?.label;
  const outcome =
    e.resolution === 'timed_out'
      ? `⏱ Timed out — \`${e.timeout_action}\` applied`
      : `✅ ${chosen ?? e.free_text ?? 'Resolved'}`;
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*${e.question}*` } },
    { type: 'section', text: { type: 'mrkdwn', text: outcome } },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `resolved ${e.resolved_at ?? ''} · \`${e.id}\`` }],
    },
  ];
}

/** The §4.5 digest: low-severity escalations batched into one message. */
export function digestBlocks(escalations: Escalation[]): SlackBlock[] {
  const header: SlackBlock = {
    type: 'header',
    text: { type: 'plain_text', text: `Purview digest — ${escalations.length} item(s)` },
  };
  const items = escalations.flatMap<SlackBlock>((e) => [
    { type: 'section', text: { type: 'mrkdwn', text: `*${e.question}*\n${e.context_summary}` } },
    {
      type: 'actions',
      elements: e.options.map((o) => ({
        type: 'button',
        text: { type: 'plain_text', text: o.label },
        action_id: `${RESOLVE_ACTION_PREFIX}:${e.id}:${o.id}`,
        value: o.id,
      })),
    },
  ]);
  return [header, ...items];
}
