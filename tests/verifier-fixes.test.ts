import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../src/store/memory.js';
import { PurviewService, type EscalationBridge } from '../src/service/purview.js';
import { digestBlocks } from '../src/slack/blocks.js';
import type { Escalation, Principal, WorkItem } from '../src/domain/types.js';

class RecordingBridge implements EscalationBridge {
  posted: Escalation[] = [];
  digests: Escalation[][] = [];
  async postEscalation(e: Escalation, _item: WorkItem): Promise<void> {
    this.posted.push(e);
  }
  async postResolution(_e: Escalation): Promise<void> {}
  async postDigest(es: Escalation[]): Promise<void> {
    this.digests.push(es);
  }
}

/** Simulates a human answering while the Slack delivery is still in flight. */
class ResolveDuringDeliveryBridge extends RecordingBridge {
  constructor(
    private readonly serviceRef: () => PurviewService,
    private readonly resolverRef: () => Principal,
  ) {
    super();
  }
  override async postEscalation(e: Escalation, item: WorkItem): Promise<void> {
    await super.postEscalation(e, item);
    this.serviceRef().resolveEscalation(e.id, {
      chosen_option_id: e.options[0]?.id ?? null,
      resolver: this.resolverRef(),
    });
  }
}

describe('fixes from independent verification', () => {
  let store: MemoryStore;
  let human: Principal;
  let agent: Principal;

  afterEach(() => {
    vi.useRealTimers();
  });

  it('blocking escalate resolves even when the answer lands during Slack delivery', async () => {
    store = new MemoryStore();
    const holder: { service?: PurviewService } = {};
    const bridge = new ResolveDuringDeliveryBridge(
      () => holder.service!,
      () => human,
    );
    const service = new PurviewService({ store, bridge, humanName: 'roscoe' });
    holder.service = service;
    human = service.defaultHuman;
    agent = service.ensureAgent('scout');

    const item = service.createWork(
      { intent: 'race', priority: 1, blast_radius: 'irreversible', idempotency_key: 'r' },
      human,
    );
    service.claim(item.id, 0, agent);

    // Real timers: this must resolve promptly via the in-flight answer, not hang.
    const { outcome } = await service.escalate(
      {
        work_item_id: item.id,
        kind: 'approval',
        question: 'Go?',
        options: [{ id: 'go', label: 'Go' }],
        context_summary: 'ctx',
        blocking: true,
        timeout_seconds: 600,
      },
      agent,
    );
    expect(outcome!.resolution).toBe('answered');
    expect(outcome!.chosen_option_id).toBe('go');
    service.shutdown();
  });

  it('a timed-out escalation surfaces in the digest as a fact (J5)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T12:00:00.000Z'));
    store = new MemoryStore();
    const bridge = new RecordingBridge();
    const service = new PurviewService({ store, bridge, humanName: 'roscoe' });
    human = service.defaultHuman;
    agent = service.ensureAgent('scout');

    const item = service.createWork(
      { intent: 'quiet thing', priority: 0, idempotency_key: 'q' },
      human,
    );
    service.claim(item.id, 1, agent); // severity 0 -> digest band
    const { escalation } = await service.escalate(
      {
        work_item_id: item.id,
        kind: 'input',
        question: 'Which region?',
        options: [{ id: 'eu', label: 'EU' }],
        context_summary: 'ctx',
        timeout_seconds: 60,
      },
      agent,
    );
    await vi.advanceTimersByTimeAsync(61_000);

    const pending = service.pendingDigest();
    expect(pending.map((e) => e.id)).toContain(escalation.id);
    expect(pending.find((e) => e.id === escalation.id)!.resolution).toBe('timed_out');

    await service.flushDigest();
    expect(bridge.digests[0]!.map((e) => e.id)).toContain(escalation.id);
    await service.flushDigest(); // the fact is delivered once
    expect(bridge.digests).toHaveLength(1);
    service.shutdown();
  });

  it('renders resolved digest entries as facts without buttons', () => {
    const resolved: Escalation = {
      id: 'esc_aaaa1111',
      work_item_id: 'wi_1',
      kind: 'input',
      raised_by_id: 'pr_a',
      question: 'Which region?',
      options: [{ id: 'eu', label: 'EU' }],
      context_summary: 'ctx',
      severity: 0.1,
      routed_to_id: 'pr_h',
      routing: 'digest',
      timeout_at: '2026-08-28T12:01:00.000Z',
      timeout_action: 'proceed',
      created_at: '2026-08-28T12:00:00.000Z',
      resolved_at: '2026-08-28T12:01:00.000Z',
      resolved_by_id: null,
      resolution: 'timed_out',
      chosen_option_id: null,
      free_text: null,
    };
    const blocks = digestBlocks([resolved]);
    expect(blocks.some((b) => b.type === 'actions')).toBe(false);
    expect(JSON.stringify(blocks)).toContain('Timed out');
  });

  it('timeout_action proceed also unblocks a blocked item', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T12:00:00.000Z'));
    store = new MemoryStore();
    const service = new PurviewService({ store, humanName: 'roscoe' });
    human = service.defaultHuman;
    agent = service.ensureAgent('scout');

    const item = service.createWork({ intent: 'x', idempotency_key: 'b' }, human);
    service.claim(item.id, 1, agent);
    service.setState(item.id, 'blocked', 'waiting on upstream', agent);
    await service.escalate(
      {
        work_item_id: item.id,
        kind: 'exception',
        question: 'Upstream is down, keep waiting?',
        context_summary: 'ctx',
        timeout_seconds: 60,
        timeout_action: 'proceed',
      },
      agent,
    );
    await vi.advanceTimersByTimeAsync(61_000);
    expect(store.getWorkItem(item.id)!.state).toBe('running');
    service.shutdown();
  });

  it('ignores agent-supplied priority: root_priority is human-assigned (spec §3)', () => {
    store = new MemoryStore();
    const service = new PurviewService({ store, humanName: 'roscoe' });
    human = service.defaultHuman;
    agent = service.ensureAgent('scout');

    const byAgent = service.createWork(
      { intent: 'self-important', priority: 1, idempotency_key: 'a' },
      agent,
    );
    expect(byAgent.priority).toBe(0.5);

    const byHuman = service.createWork(
      { intent: 'actually urgent', priority: 1, idempotency_key: 'h' },
      human,
    );
    expect(byHuman.priority).toBe(1);
    service.shutdown();
  });

  it('never assigns colliding sibling path segments', () => {
    store = new MemoryStore();
    const service = new PurviewService({ store, humanName: 'roscoe' });
    human = service.defaultHuman;

    const root = service.createWork({ intent: 'wide', idempotency_key: 'root' }, human);
    for (let i = 0; i < 600; i += 1) {
      service.createWork({ parent_id: root.id, intent: `c${i}`, idempotency_key: `c${i}` }, human);
    }
    const paths = store.children(root.id).map((c) => c.path);
    expect(new Set(paths).size).toBe(600);
    service.shutdown();
  });
});
