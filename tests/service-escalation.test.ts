import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../src/store/memory.js';
import { PurviewService, type EscalationBridge } from '../src/service/purview.js';
import type { Escalation, Principal, WorkItem } from '../src/domain/types.js';

class StubBridge implements EscalationBridge {
  posted: Escalation[] = [];
  resolutions: Escalation[] = [];
  digests: Escalation[][] = [];
  async postEscalation(e: Escalation, _item: WorkItem): Promise<void> {
    this.posted.push(e);
  }
  async postResolution(e: Escalation): Promise<void> {
    this.resolutions.push(e);
  }
  async postDigest(es: Escalation[]): Promise<void> {
    this.digests.push(es);
  }
}

describe('PurviewService escalations', () => {
  let store: MemoryStore;
  let bridge: StubBridge;
  let service: PurviewService;
  let human: Principal;
  let agent: Principal;

  function makeRunningItem(overrides: { blast_radius?: WorkItem['blast_radius']; confidence?: number | null; priority?: number } = {}): WorkItem {
    const item = service.createWork(
      {
        intent: 'do something',
        priority: overrides.priority ?? 0,
        blast_radius: overrides.blast_radius ?? 'none',
        idempotency_key: `k-${Math.random()}`,
      },
      human,
    );
    return service.claim(item.id, overrides.confidence ?? 1, agent);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T12:00:00.000Z'));
    store = new MemoryStore();
    bridge = new StubBridge();
    service = new PurviewService({
      store,
      bridge,
      humanName: 'roscoe',
      humanAttention: { interrupts_per_hour: 2 },
    });
    human = service.defaultHuman;
    agent = service.ensureAgent('scout');
  });

  afterEach(() => {
    service.shutdown();
    vi.useRealTimers();
  });

  it('rejects badly formed escalations at creation', async () => {
    const item = makeRunningItem();
    await expect(
      service.escalate(
        { work_item_id: item.id, kind: 'approval', question: 'ok?', options: [], context_summary: 'ctx' },
        agent,
      ),
    ).rejects.toThrow(/option/i);
    await expect(
      service.escalate(
        {
          work_item_id: item.id,
          kind: 'approval',
          question: 'ok?',
          options: [{ id: 'y', label: 'Yes' }],
          context_summary: 'x'.repeat(281),
        },
        agent,
      ),
    ).rejects.toThrow(/280/);
    const six = Array.from({ length: 6 }, (_, i) => ({ id: `o${i}`, label: `Option ${i}` }));
    await expect(
      service.escalate(
        { work_item_id: item.id, kind: 'decision', question: 'which?', options: six, context_summary: 'ctx' },
        agent,
      ),
    ).rejects.toThrow(/5/);
  });

  it('computes severity server-side, routes to the delegating human, and gates approval', async () => {
    const item = makeRunningItem({ blast_radius: 'irreversible', confidence: 0, priority: 1 });
    const { escalation } = await service.escalate(
      {
        work_item_id: item.id,
        kind: 'approval',
        question: 'Send it?',
        options: [{ id: 'send', label: 'Send' }, { id: 'hold', label: 'Hold' }],
        context_summary: 'About to send the quote.',
      },
      agent,
    );
    expect(escalation.severity).toBeGreaterThanOrEqual(0.7);
    expect(escalation.routing).toBe('immediate');
    expect(escalation.routed_to_id).toBe(human.id);
    expect(store.getWorkItem(item.id)!.state).toBe('awaiting_approval');
    expect(store.getWorkItem(item.id)!.rollup.attention).toBe('approval');
    expect(bridge.posted.map((e) => e.id)).toEqual([escalation.id]);
  });

  it('spends the hourly interrupt budget and demotes to digest when exhausted', async () => {
    // irreversible + confidence 1 + no deadline + priority 0 => severity exactly 0.4 (queued band)
    const mk = () => makeRunningItem({ blast_radius: 'irreversible', confidence: 1 });
    const opts = [{ id: 'y', label: 'Yes' }];
    const e1 = await service.escalate({ work_item_id: mk().id, kind: 'decision', question: 'a?', options: opts, context_summary: 'c' }, agent);
    const e2 = await service.escalate({ work_item_id: mk().id, kind: 'decision', question: 'b?', options: opts, context_summary: 'c' }, agent);
    const e3 = await service.escalate({ work_item_id: mk().id, kind: 'decision', question: 'c?', options: opts, context_summary: 'c' }, agent);
    expect(e1.escalation.routing).toBe('queued');
    expect(e2.escalation.routing).toBe('queued');
    expect(e3.escalation.routing).toBe('digest');
    // digest is deferred, not dropped: still visible in the owner's queue
    const queue = service.query({ principal_id: human.id });
    expect(queue.escalations.map((e) => e.id)).toContain(e3.escalation.id);
    // and not pushed to Slack at creation
    expect(bridge.posted.map((e) => e.id)).toEqual([e1.escalation.id, e2.escalation.id]);
  });

  it('blocking escalate resolves when a human answers', async () => {
    const item = makeRunningItem({ blast_radius: 'irreversible', confidence: 0, priority: 1 });
    const pending = service.escalate(
      {
        work_item_id: item.id,
        kind: 'approval',
        question: 'Proceed?',
        options: [{ id: 'go', label: 'Go' }, { id: 'stop', label: 'Stop' }],
        context_summary: 'ctx',
        blocking: true,
        timeout_seconds: 1800,
      },
      agent,
    );
    await vi.advanceTimersByTimeAsync(214_000);
    const open = store.openEscalationsFor(human.id);
    expect(open).toHaveLength(1);
    service.resolveEscalation(open[0]!.id, { chosen_option_id: 'go', free_text: 'ship it', resolver: human });
    const { escalation, outcome } = await pending;
    expect(outcome).toEqual({
      resolution: 'answered',
      chosen_option_id: 'go',
      free_text: 'ship it',
      resolved_by: human.id,
      waited_seconds: 214,
    });
    expect(escalation.resolution).toBe('answered');
    expect(store.getWorkItem(item.id)!.state).toBe('running'); // approval answered -> unblocked
    const decisions = store.entries(item.id, ['decision']);
    expect(decisions).toHaveLength(1);
    expect(decisions[0]!.author_id).toBe(human.id);
    expect(bridge.resolutions.map((e) => e.id)).toContain(escalation.id);
  });

  it('times out with abort: item fails and the decision has no human author (J5)', async () => {
    const item = makeRunningItem({ blast_radius: 'irreversible', confidence: 0, priority: 1 });
    const pending = service.escalate(
      {
        work_item_id: item.id,
        kind: 'approval',
        question: 'Proceed?',
        options: [{ id: 'go', label: 'Go' }],
        context_summary: 'ctx',
        blocking: true,
        timeout_seconds: 60,
        timeout_action: 'abort',
      },
      agent,
    );
    await vi.advanceTimersByTimeAsync(61_000);
    const { outcome } = await pending;
    expect(outcome!.resolution).toBe('timed_out');
    expect(outcome!.chosen_option_id).toBeNull();
    expect(store.getWorkItem(item.id)!.state).toBe('failed');
    const decisions = store.entries(item.id, ['decision']);
    expect(decisions).toHaveLength(1);
    expect(decisions[0]!.author_id).toBe(service.systemPrincipal.id);
  });

  it('times out with proceed: an awaiting approval returns to running', async () => {
    const item = makeRunningItem({ blast_radius: 'reversible' });
    const pending = service.escalate(
      {
        work_item_id: item.id,
        kind: 'approval',
        question: 'Proceed?',
        options: [{ id: 'go', label: 'Go' }],
        context_summary: 'ctx',
        blocking: true,
        timeout_seconds: 60,
        // timeout_action defaults from blast radius: reversible -> proceed
      },
      agent,
    );
    await vi.advanceTimersByTimeAsync(61_000);
    const { outcome } = await pending;
    expect(outcome!.resolution).toBe('timed_out');
    expect(store.getWorkItem(item.id)!.state).toBe('running');
  });

  it('escalate_up re-raises to the delegate on timeout', async () => {
    const backup = service.createPrincipal({ kind: 'human', display_name: 'backup' });
    human.attention!.auto_delegate_to = backup.id;
    store.putPrincipal(human);
    const item = makeRunningItem({ blast_radius: 'irreversible', confidence: 0, priority: 1 });
    await service.escalate(
      {
        work_item_id: item.id,
        kind: 'approval',
        question: 'Proceed?',
        options: [{ id: 'go', label: 'Go' }],
        context_summary: 'ctx',
        timeout_seconds: 60,
        timeout_action: 'escalate_up',
      },
      agent,
    );
    await vi.advanceTimersByTimeAsync(61_000);
    const open = store.openEscalations();
    expect(open).toHaveLength(1);
    expect(open[0]!.routed_to_id).toBe(backup.id);
    expect(open[0]!.question).toBe('Proceed?');
  });

  it('rejects resolving an already-resolved escalation and unknown options', async () => {
    const item = makeRunningItem({ blast_radius: 'irreversible', confidence: 0, priority: 1 });
    const { escalation } = await service.escalate(
      { work_item_id: item.id, kind: 'approval', question: 'q', options: [{ id: 'y', label: 'Y' }], context_summary: 'c' },
      agent,
    );
    expect(() =>
      service.resolveEscalation(escalation.id, { chosen_option_id: 'nope', resolver: human }),
    ).toThrow(/option/i);
    service.resolveEscalation(escalation.id, { chosen_option_id: 'y', resolver: human });
    expect(() =>
      service.resolveEscalation(escalation.id, { chosen_option_id: 'y', resolver: human }),
    ).toThrow(/resolved/i);
  });

  it('flushes digest-band escalations as a batch', async () => {
    const mk = () => makeRunningItem(); // severity 0 -> digest
    const opts = [{ id: 'y', label: 'Yes' }];
    const a = await service.escalate({ work_item_id: mk().id, kind: 'input', question: 'a?', options: opts, context_summary: 'c' }, agent);
    const b = await service.escalate({ work_item_id: mk().id, kind: 'input', question: 'b?', options: opts, context_summary: 'c' }, agent);
    expect(service.pendingDigest().map((e) => e.id).sort()).toEqual([a.escalation.id, b.escalation.id].sort());
    await service.flushDigest();
    expect(bridge.digests).toHaveLength(1);
    expect(bridge.digests[0]!).toHaveLength(2);
    await service.flushDigest(); // nothing new: no empty digest posted
    expect(bridge.digests).toHaveLength(1);
  });
});
