import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { digestBlocks, escalationBlocks, resolvedBlocks } from '../src/slack/blocks.js';
import { SlackBridge } from '../src/slack/bridge.js';
import { parseInteraction } from '../src/slack/interactions.js';
import { verifySlackSignature } from '../src/slack/verify.js';
import type { Escalation, WorkItem } from '../src/domain/types.js';
import { emptyRollup } from '../src/domain/rollup.js';

function escalation(overrides: Partial<Escalation> = {}): Escalation {
  return {
    id: 'esc_11112222',
    work_item_id: 'wi_04d70000',
    kind: 'approval',
    raised_by_id: 'pr_agent000',
    question: 'Send the revised quote to the client?',
    options: [
      { id: 'send', label: 'Send it' },
      { id: 'hold', label: 'Hold for review' },
    ],
    context_summary: 'Rebuilt pricing after the bureau change. Total moved 4,180 -> 4,610 GBP.',
    severity: 0.82,
    routed_to_id: 'pr_human000',
    routing: 'immediate',
    timeout_at: '2026-08-28T12:30:00.000Z',
    timeout_action: 'abort',
    created_at: '2026-08-28T12:00:00.000Z',
    resolved_at: null,
    resolved_by_id: null,
    resolution: null,
    chosen_option_id: null,
    free_text: null,
    ...overrides,
  };
}

function workItem(): WorkItem {
  return {
    id: 'wi_04d70000',
    parent_id: null,
    root_id: 'wi_04d70000',
    path: '04d7',
    depth: 0,
    intent: 'Requote the client after the bureau change',
    spec: null,
    labels: [],
    owner_id: 'pr_agent000',
    created_by_id: 'pr_human000',
    state: 'awaiting_approval',
    state_reason: null,
    rollup: emptyRollup({ state: 'awaiting_approval', blast_radius: 'irreversible', consumed: {}, budget: null, deadline: null }),
    blast_radius: 'irreversible',
    confidence: 0.4,
    priority: 0.8,
    budget: null,
    consumed: {},
    artifacts: [],
    provenance: [],
    created_at: '2026-08-28T11:00:00.000Z',
    started_at: null,
    closed_at: null,
    deadline: null,
    idempotency_key: 'k',
  };
}

describe('verifySlackSignature', () => {
  const secret = 'test-signing-secret';
  const body = 'payload=%7B%22type%22%3A%22block_actions%22%7D';
  const now = new Date('2026-08-28T12:00:00.000Z');
  const ts = String(Math.floor(now.getTime() / 1000));

  function sign(timestamp: string, rawBody: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(`v0:${timestamp}:${rawBody}`);
    return `v0=${hmac.digest('hex')}`;
  }

  it('accepts a valid signature', () => {
    expect(
      verifySlackSignature({ signingSecret: secret, timestamp: ts, rawBody: body, signature: sign(ts, body), now }),
    ).toBe(true);
  });

  it('rejects a tampered body and a wrong secret', () => {
    expect(
      verifySlackSignature({ signingSecret: secret, timestamp: ts, rawBody: body + 'x', signature: sign(ts, body), now }),
    ).toBe(false);
    expect(
      verifySlackSignature({ signingSecret: 'other', timestamp: ts, rawBody: body, signature: sign(ts, body), now }),
    ).toBe(false);
  });

  it('rejects a stale timestamp (replay window)', () => {
    const old = String(Math.floor(now.getTime() / 1000) - 600);
    expect(
      verifySlackSignature({ signingSecret: secret, timestamp: old, rawBody: body, signature: sign(old, body), now }),
    ).toBe(false);
  });
});

describe('escalationBlocks', () => {
  it('renders question, summary and one button per option', () => {
    const blocks = escalationBlocks(escalation(), workItem());
    const json = JSON.stringify(blocks);
    expect(json).toContain('Send the revised quote to the client?');
    expect(json).toContain('Rebuilt pricing after the bureau change');
    const actions = blocks.find((b) => b.type === 'actions') as { elements: unknown[] };
    expect(actions.elements).toHaveLength(2);
    expect(json).toContain('resolve:esc_11112222:send');
    expect(json).toContain('resolve:esc_11112222:hold');
  });

  it('renders a resolved card without buttons and a digest batch', () => {
    const resolved = resolvedBlocks(
      escalation({ resolution: 'answered', chosen_option_id: 'hold', resolved_at: '2026-08-28T12:03:34.000Z' }),
    );
    const json = JSON.stringify(resolved);
    expect(json).toContain('Hold for review');
    expect(resolved.some((b) => b.type === 'actions')).toBe(false);

    const digest = digestBlocks([escalation(), escalation({ id: 'esc_33334444', question: 'Another?' })]);
    expect(JSON.stringify(digest)).toContain('Another?');
  });
});

describe('parseInteraction', () => {
  it('extracts the escalation, option, user and response_url from block_actions', () => {
    const payload = {
      type: 'block_actions',
      user: { id: 'U123', username: 'roscoe', name: 'roscoe' },
      response_url: 'https://hooks.slack.com/actions/T0/123/abc',
      actions: [{ action_id: 'resolve:esc_11112222:hold', type: 'button', value: 'hold' }],
    };
    expect(parseInteraction(JSON.stringify(payload))).toEqual({
      escalation_id: 'esc_11112222',
      option_id: 'hold',
      user_name: 'roscoe',
      response_url: 'https://hooks.slack.com/actions/T0/123/abc',
    });
  });

  it('returns null for payloads that are not resolve actions', () => {
    expect(parseInteraction(JSON.stringify({ type: 'block_actions', actions: [{ action_id: 'other' }] }))).toBeNull();
    expect(parseInteraction('not json')).toBeNull();
  });
});

describe('SlackBridge', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts escalations to the webhook', async () => {
    const bridge = new SlackBridge({ webhookUrl: 'https://hooks.slack.com/services/T/B/X' });
    await bridge.postEscalation(escalation(), workItem());
    const mock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(mock).toHaveBeenCalledTimes(1);
    const [url, init] = mock.mock.calls[0]!;
    expect(url).toBe('https://hooks.slack.com/services/T/B/X');
    expect(JSON.parse((init as RequestInit).body as string).blocks).toBeDefined();
  });

  it('updates the original message through response_url on resolution', async () => {
    const bridge = new SlackBridge({ webhookUrl: 'https://hooks.slack.com/services/T/B/X' });
    const resolved = escalation({ resolution: 'answered', chosen_option_id: 'hold', resolved_at: '2026-08-28T12:03:00.000Z' });
    await bridge.postResolution(resolved, 'https://hooks.slack.com/actions/T0/123/abc');
    const mock = fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, init] = mock.mock.calls[0]!;
    expect(url).toBe('https://hooks.slack.com/actions/T0/123/abc');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.replace_original).toBe(true);
  });

  it('is a no-op without configuration', async () => {
    const bridge = new SlackBridge({});
    await bridge.postEscalation(escalation(), workItem());
    expect(fetch).not.toHaveBeenCalled();
  });
});
