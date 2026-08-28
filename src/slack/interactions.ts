import { RESOLVE_ACTION_PREFIX } from './blocks.js';

export interface ResolveInteraction {
  escalation_id: string;
  option_id: string;
  user_name: string;
  response_url: string;
}

/**
 * Parse a Slack `block_actions` payload (the JSON string in the `payload`
 * form field) into a resolve action, or null when it is not one of ours.
 */
export function parseInteraction(payloadJson: string): ResolveInteraction | null {
  let payload: unknown;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as {
    type?: string;
    user?: { username?: string; name?: string; id?: string };
    response_url?: string;
    actions?: Array<{ action_id?: string }>;
  };
  if (p.type !== 'block_actions') return null;
  const action = p.actions?.find((a) => a.action_id?.startsWith(`${RESOLVE_ACTION_PREFIX}:`));
  if (!action?.action_id) return null;
  const [, escalation_id, option_id] = action.action_id.split(':');
  if (!escalation_id || !option_id) return null;
  return {
    escalation_id,
    option_id,
    user_name: p.user?.username ?? p.user?.name ?? p.user?.id ?? 'unknown',
    response_url: p.response_url ?? '',
  };
}
