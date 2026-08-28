import { addBudget, fitsWithin, remainingBudget } from '../domain/budget.js';
import { newId, newPathSegment } from '../domain/ids.js';
import { computeSeverity, routeEscalation } from '../domain/severity.js';
import { computeRollup, emptyRollup, type RollupOwnInput } from '../domain/rollup.js';
import { canTransition, reasonRequired } from '../domain/states.js';
import type {
  ArtifactRef,
  AttentionProfile,
  BlastRadius,
  Budget,
  EntryKind,
  Escalation,
  EscalationKind,
  EscalationOption,
  EscalationResolution,
  Principal,
  PrincipalId,
  PrincipalKind,
  TimeoutAction,
  TranscriptEntry,
  WorkItem,
  WorkItemId,
  WorkState,
} from '../domain/types.js';
import type { Store } from '../store/store.js';

/** Notification port. The Slack bridge implements this; tests stub it. */
export interface EscalationBridge {
  postEscalation(escalation: Escalation, item: WorkItem): Promise<void>;
  postResolution(escalation: Escalation): Promise<void>;
  postDigest(escalations: Escalation[]): Promise<void>;
}

export interface PurviewServiceOptions {
  store: Store;
  bridge?: EscalationBridge;
  /** Display name of the accountable human every unknown agent delegates to. */
  humanName?: string;
  humanAttention?: Partial<AttentionProfile>;
  now?: () => Date;
}

export interface CreateWorkArgs {
  parent_id?: WorkItemId | null;
  intent: string;
  priority?: number;
  blast_radius?: BlastRadius;
  budget?: Budget | null;
  deadline?: string | null;
  labels?: string[];
  idempotency_key: string;
}

export interface FanOutChildSpec {
  intent: string;
  blast_radius?: BlastRadius;
  budget?: Budget | null;
  deadline?: string | null;
  labels?: string[];
}

export interface ReportArgs {
  kind: Extract<EntryKind, 'note' | 'tool_call' | 'artifact'>;
  body: string;
  payload?: unknown;
  cost?: Budget;
  context_digest?: string | null;
}

export interface QueryArgs {
  work_item_id?: WorkItemId;
  principal_id?: PrincipalId;
  depth?: number;
  attention_only?: boolean;
}

export interface QueryResult {
  items: WorkItem[];
  escalations: Escalation[];
}

const MAX_DELEGATION_DEPTH = 8;
const CLOSED_STATES: readonly WorkState[] = ['done', 'failed', 'abandoned'];

const DEFAULT_ATTENTION: AttentionProfile = {
  interrupts_per_hour: 4,
  quiet_hours: [],
  timezone: 'UTC',
  escalation_channels: ['slack'],
  auto_delegate_to: null,
};

export class PurviewService {
  readonly defaultHuman: Principal;
  /** Authors system-generated transcript entries, e.g. timeout decisions (J5). */
  readonly systemPrincipal: Principal;

  protected readonly store: Store;
  protected readonly bridge: EscalationBridge | undefined;
  protected readonly now: () => Date;

  constructor(opts: PurviewServiceOptions) {
    this.store = opts.store;
    this.bridge = opts.bridge;
    this.now = opts.now ?? (() => new Date());

    const humanName = opts.humanName ?? 'operator';
    this.defaultHuman =
      this.store.findPrincipalByName(humanName) ??
      this.createPrincipal({
        kind: 'human',
        display_name: humanName,
        attention: { ...DEFAULT_ATTENTION, ...opts.humanAttention },
      });
    this.systemPrincipal =
      this.store.findPrincipalByName('purview') ??
      this.createPrincipal({ kind: 'service', display_name: 'purview' });
  }

  // -------------------------------------------------------------------------
  // Principals
  // -------------------------------------------------------------------------

  createPrincipal(args: {
    kind: PrincipalKind;
    display_name: string;
    delegated_by?: PrincipalId | null;
    attention?: AttentionProfile | null;
  }): Principal {
    let depth = 0;
    if (args.delegated_by) {
      const delegator = this.store.getPrincipal(args.delegated_by);
      if (!delegator) throw new Error(`unknown delegator: ${args.delegated_by}`);
      depth = delegator.delegation_depth + 1;
      if (depth > MAX_DELEGATION_DEPTH) {
        throw new Error(`delegation depth ceiling (${MAX_DELEGATION_DEPTH}) exceeded`);
      }
    }
    const principal: Principal = {
      id: newId('pr'),
      kind: args.kind,
      display_name: args.display_name,
      delegated_by: args.delegated_by ?? null,
      delegation_depth: depth,
      capabilities: [],
      attention: args.kind === 'human' ? (args.attention ?? { ...DEFAULT_ATTENTION }) : null,
      created_at: this.now().toISOString(),
      revoked_at: null,
    };
    this.store.putPrincipal(principal);
    return principal;
  }

  /** Auto-registration for MCP callers: unknown names become agents delegated by the default human. */
  ensureAgent(display_name: string): Principal {
    const existing = this.store.findPrincipalByName(display_name);
    if (existing) return existing;
    return this.createPrincipal({
      kind: 'agent',
      display_name,
      delegated_by: this.defaultHuman.id,
    });
  }

  getPrincipal(id: PrincipalId): Principal | undefined {
    return this.store.getPrincipal(id);
  }

  // -------------------------------------------------------------------------
  // Work lifecycle
  // -------------------------------------------------------------------------

  createWork(args: CreateWorkArgs, actor: Principal): WorkItem {
    if (!args.idempotency_key) throw new Error('idempotency_key is required');
    const existing = this.store.getByIdempotencyKey(args.idempotency_key);
    if (existing) return existing;

    const parent = args.parent_id ? this.mustGet(args.parent_id) : null;
    if (parent) this.assertBudgetFits(parent, args.budget ?? null);

    const id = newId('wi');
    const segment = newPathSegment();
    const nowIso = this.now().toISOString();
    const rollupInput: RollupOwnInput = {
      state: 'ready',
      blast_radius: args.blast_radius ?? 'none',
      consumed: {},
      budget: args.budget ?? null,
      deadline: args.deadline ?? null,
    };
    const item: WorkItem = {
      id,
      parent_id: parent?.id ?? null,
      root_id: parent?.root_id ?? id,
      path: parent ? `${parent.path}.${segment}` : segment,
      depth: parent ? parent.depth + 1 : 0,
      intent: args.intent,
      spec: null,
      labels: args.labels ?? [],
      owner_id: null,
      created_by_id: actor.id,
      state: 'ready',
      state_reason: null,
      rollup: emptyRollup(rollupInput),
      blast_radius: args.blast_radius ?? 'none',
      confidence: null,
      priority: args.priority ?? (parent ? this.mustGet(parent.root_id).priority : 0.5),
      budget: args.budget ?? null,
      consumed: {},
      artifacts: [],
      provenance: [],
      created_at: nowIso,
      started_at: null,
      closed_at: null,
      deadline: args.deadline ?? null,
      idempotency_key: args.idempotency_key,
    };
    this.store.putWorkItem(item);
    this.appendEntry(item.id, 'state_change', `created (ready): ${args.intent}`, actor, null);
    if (parent) this.recomputeUp(parent.id);
    return item;
  }

  /** Create N children atomically; rejected outright if the batch oversubscribes the parent budget. */
  fanOut(
    parent_id: WorkItemId,
    children: FanOutChildSpec[],
    idempotency_key: string,
    actor: Principal,
  ): WorkItem[] {
    if (!idempotency_key) throw new Error('idempotency_key is required');
    if (children.length === 0) throw new Error('fan_out requires at least one child');

    const firstExisting = this.store.getByIdempotencyKey(`${idempotency_key}:0`);
    if (firstExisting) {
      return children.map((_, i) => {
        const c = this.store.getByIdempotencyKey(`${idempotency_key}:${i}`);
        if (!c) throw new Error(`fan_out replay mismatch at index ${i}`);
        return c;
      });
    }

    const parent = this.mustGet(parent_id);
    const batchBudget = children.reduce<Budget>((acc, c) => addBudget(acc, c.budget ?? {}), {});
    this.assertBudgetFits(parent, batchBudget);

    return children.map((c, i) =>
      this.createWork(
        {
          parent_id,
          intent: c.intent,
          blast_radius: c.blast_radius,
          budget: c.budget,
          deadline: c.deadline,
          labels: c.labels,
          idempotency_key: `${idempotency_key}:${i}`,
        },
        actor,
      ),
    );
  }

  claim(work_item_id: WorkItemId, confidence: number | null, actor: Principal): WorkItem {
    const item = this.mustGet(work_item_id);
    if (!canTransition(item.state, 'running')) {
      throw new Error(`cannot claim ${work_item_id}: state is ${item.state}`);
    }
    item.state = 'running';
    item.state_reason = null;
    item.owner_id = actor.id;
    item.confidence = confidence;
    item.started_at = this.now().toISOString();
    this.store.putWorkItem(item);
    this.appendEntry(item.id, 'state_change', `claimed by ${actor.display_name}`, actor, {
      confidence,
    });
    this.recomputeUp(item.id);
    return item;
  }

  report(work_item_id: WorkItemId, args: ReportArgs, actor: Principal): TranscriptEntry {
    const item = this.mustGet(work_item_id);
    if (args.cost) {
      item.consumed = addBudget(item.consumed, args.cost);
    }
    if (args.kind === 'artifact') {
      const p = (args.payload ?? {}) as Partial<ArtifactRef>;
      item.artifacts = [
        ...item.artifacts,
        { kind: p.kind ?? 'text', uri: p.uri ?? null, label: p.label ?? args.body },
      ];
    }
    this.store.putWorkItem(item);
    const entry = this.appendEntry(
      item.id,
      args.kind,
      args.body,
      actor,
      args.payload ?? null,
      args.context_digest ?? null,
    );
    if (args.cost) this.recomputeUp(item.id);
    return entry;
  }

  setState(
    work_item_id: WorkItemId,
    state: WorkState,
    state_reason: string | null,
    actor: Principal,
  ): WorkItem {
    const item = this.mustGet(work_item_id);
    if (!canTransition(item.state, state)) {
      throw new Error(`illegal transition ${item.state} -> ${state} on ${work_item_id}`);
    }
    if (reasonRequired(state) && !state_reason) {
      throw new Error(`state_reason is required when entering ${state}`);
    }
    item.state = state;
    item.state_reason = state_reason;
    if (CLOSED_STATES.includes(state)) item.closed_at = this.now().toISOString();
    this.store.putWorkItem(item);
    this.appendEntry(
      item.id,
      'state_change',
      `${state}${state_reason ? `: ${state_reason}` : ''}`,
      actor,
      null,
    );
    this.recomputeUp(item.id);
    return item;
  }

  complete(
    work_item_id: WorkItemId,
    result: string | null,
    artifacts: ArtifactRef[],
    actor: Principal,
  ): WorkItem {
    const item = this.mustGet(work_item_id);
    if (artifacts.length > 0) {
      item.artifacts = [...item.artifacts, ...artifacts];
      this.store.putWorkItem(item);
    }
    const closed = this.setState(work_item_id, 'done', null, actor);
    if (result) this.appendEntry(item.id, 'note', result, actor, null);
    return closed;
  }

  abandon(work_item_id: WorkItemId, reason: string, actor: Principal): WorkItem {
    return this.setState(work_item_id, 'abandoned', reason, actor);
  }

  query(args: QueryArgs): QueryResult {
    if (args.work_item_id) {
      const item = this.mustGet(args.work_item_id);
      let items = this.store.subtree(item.path, args.depth);
      if (args.attention_only) {
        items = items.filter((i) => i.rollup.attention !== null || i.id === item.id);
      }
      items.sort((a, b) => (a.path < b.path ? -1 : 1));
      return { items, escalations: [] };
    }
    if (args.principal_id) {
      const items = this.store
        .itemsOwnedBy(args.principal_id)
        .filter((i) => !CLOSED_STATES.includes(i.state));
      return { items, escalations: this.store.openEscalationsFor(args.principal_id) };
    }
    throw new Error('query requires work_item_id or principal_id');
  }

  /** Read a work item's transcript, optionally filtered by entry kind. */
  transcript(work_item_id: WorkItemId, kinds?: EntryKind[]): TranscriptEntry[] {
    this.mustGet(work_item_id);
    return this.store.entries(work_item_id, kinds);
  }

  // -------------------------------------------------------------------------
  // Escalations (spec §1.4, §3; journeys J3 and J5)
  // -------------------------------------------------------------------------

  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly waiters = new Map<string, (outcome: EscalateOutcome) => void>();
  private readonly interruptLog = new Map<PrincipalId, number[]>();
  private readonly flushedDigestIds = new Set<string>();

  /**
   * Raise an escalation. Severity and routing are computed server-side; with
   * `blocking: true` the returned promise long-polls until an answer or
   * `timeout_at`, so the agent can branch deterministically on the outcome.
   */
  async escalate(
    args: EscalateArgs,
    actor: Principal,
  ): Promise<{ escalation: Escalation; outcome: EscalateOutcome | null }> {
    const item = this.mustGet(args.work_item_id);
    const options = args.options ?? [];
    if (!args.question) throw new Error('question is required');
    if (!args.context_summary || args.context_summary.length > 280) {
      throw new Error('context_summary is required and must be at most 280 characters');
    }
    if ((args.kind === 'approval' || args.kind === 'decision') && options.length === 0) {
      throw new Error(`${args.kind} escalations need at least one option`);
    }
    if (options.length > 5) {
      throw new Error('at most 5 options: a human must resolve this from a lock screen');
    }

    const root = this.mustGet(item.root_id);
    const now = this.now();
    const severity = computeSeverity({
      blast_radius: item.blast_radius,
      confidence: item.confidence,
      deadline: parseDate(item.deadline ?? root.deadline),
      now,
      root_priority: root.priority,
    });
    const target = this.humanFor(item);
    const { band } = routeEscalation(
      severity,
      target.attention,
      this.interruptsUsed(target.id, now),
      now,
    );
    if (band === 'queued') this.recordInterrupt(target.id, now);

    const timeoutSeconds = args.timeout_seconds ?? 1800;
    const timeoutAction =
      args.timeout_action ??
      (item.blast_radius === 'irreversible' || item.blast_radius === 'costly'
        ? 'abort'
        : 'proceed');

    const escalation: Escalation = {
      id: newId('esc'),
      work_item_id: item.id,
      kind: args.kind,
      raised_by_id: actor.id,
      question: args.question,
      options,
      context_summary: args.context_summary,
      severity,
      routed_to_id: target.id,
      routing: band,
      timeout_at: new Date(now.getTime() + timeoutSeconds * 1000).toISOString(),
      timeout_action: timeoutAction,
      created_at: now.toISOString(),
      resolved_at: null,
      resolved_by_id: null,
      resolution: null,
      chosen_option_id: null,
      free_text: null,
    };
    this.store.putEscalation(escalation);
    this.appendEntry(item.id, 'escalation', args.question, actor, {
      escalation_id: escalation.id,
      kind: args.kind,
      options,
      severity,
      routing: band,
    });

    if (args.kind === 'approval' && canTransition(item.state, 'awaiting_approval')) {
      this.setState(item.id, 'awaiting_approval', null, actor);
    }

    if (band !== 'digest') {
      await this.notify((b) => b.postEscalation(escalation, item));
    }
    this.scheduleTimeout(escalation.id, timeoutSeconds);

    if (!args.blocking) return { escalation, outcome: null };

    const outcome = await new Promise<EscalateOutcome>((resolve) => {
      this.waiters.set(escalation.id, resolve);
    });
    const resolved = this.store.getEscalation(escalation.id) ?? escalation;
    return { escalation: resolved, outcome };
  }

  /** A human (or delegate) answers. One tap: option id, optional free text. */
  resolveEscalation(
    escalation_id: string,
    args: { chosen_option_id?: string | null; free_text?: string | null; resolver: Principal },
  ): Escalation {
    const escalation = this.mustGetEscalation(escalation_id);
    if (escalation.resolved_at) {
      throw new Error(`escalation ${escalation_id} is already resolved`);
    }
    const chosen = args.chosen_option_id ?? null;
    if (chosen && !escalation.options.some((o) => o.id === chosen)) {
      throw new Error(`unknown option ${chosen} for escalation ${escalation_id}`);
    }
    const now = this.now();
    escalation.resolved_at = now.toISOString();
    escalation.resolved_by_id = args.resolver.id;
    escalation.resolution = 'answered';
    escalation.chosen_option_id = chosen;
    escalation.free_text = args.free_text ?? null;
    this.store.putEscalation(escalation);

    const chosenLabel = escalation.options.find((o) => o.id === chosen)?.label;
    this.appendEntry(
      escalation.work_item_id,
      'decision',
      chosenLabel ?? args.free_text ?? 'resolved',
      args.resolver,
      {
        escalation_id: escalation.id,
        question: escalation.question,
        options_shown: escalation.options,
        chosen_option_id: chosen,
        free_text: escalation.free_text,
      },
    );
    this.unblockAfterResolution(escalation, args.resolver);
    void this.notify((b) => b.postResolution(escalation));
    this.settle(escalation);
    return escalation;
  }

  /** Digest-band escalations not yet delivered (deferred, never dropped). */
  pendingDigest(): Escalation[] {
    return this.store
      .openEscalations()
      .filter((e) => e.routing === 'digest' && !this.flushedDigestIds.has(e.id));
  }

  async flushDigest(): Promise<void> {
    const pending = this.pendingDigest();
    if (pending.length === 0) return;
    await this.notify((b) => b.postDigest(pending));
    for (const e of pending) this.flushedDigestIds.add(e.id);
  }

  /** Cancel outstanding timers (server shutdown, test teardown). */
  shutdown(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  private scheduleTimeout(escalation_id: string, timeoutSeconds: number): void {
    const timer = setTimeout(() => this.handleTimeout(escalation_id), timeoutSeconds * 1000);
    timer.unref?.();
    this.timers.set(escalation_id, timer);
  }

  /** J5: nobody answered. The declared timeout_action fires; nothing is silently lost. */
  private handleTimeout(escalation_id: string): void {
    const escalation = this.store.getEscalation(escalation_id);
    if (!escalation || escalation.resolved_at) return;
    const now = this.now();
    escalation.resolved_at = now.toISOString();
    escalation.resolved_by_id = null;
    escalation.resolution = 'timed_out';
    this.store.putEscalation(escalation);

    // The timeout is recorded as a decision with no human author.
    this.appendEntry(
      escalation.work_item_id,
      'decision',
      `escalation timed out; timeout_action=${escalation.timeout_action}`,
      this.systemPrincipal,
      {
        escalation_id: escalation.id,
        question: escalation.question,
        options_shown: escalation.options,
        timeout_action: escalation.timeout_action,
      },
    );

    const item = this.store.getWorkItem(escalation.work_item_id);
    if (item) {
      switch (escalation.timeout_action) {
        case 'abort':
          if (canTransition(item.state, 'failed')) {
            this.setState(item.id, 'failed', 'escalation timed out (timeout_action=abort)', this.systemPrincipal);
          }
          break;
        case 'proceed':
          if (item.state === 'awaiting_approval') {
            this.setState(item.id, 'running', null, this.systemPrincipal);
          }
          break;
        case 'escalate_up': {
          const current = escalation.routed_to_id
            ? this.store.getPrincipal(escalation.routed_to_id)
            : undefined;
          const next =
            (current?.attention?.auto_delegate_to &&
              this.store.getPrincipal(current.attention.auto_delegate_to)) ||
            (current?.delegated_by && this.store.getPrincipal(current.delegated_by)) ||
            this.defaultHuman;
          this.reRaise(escalation, next);
          break;
        }
        case 'fallback_owner': {
          const root = this.store.getWorkItem(item.root_id);
          const target = root ? this.humanFor(root) : this.defaultHuman;
          this.reRaise(escalation, target);
          break;
        }
      }
    }

    void this.notify((b) => b.postResolution(escalation));
    this.settle(escalation);
  }

  /** Re-raise a timed-out escalation to a new human, preserving the question. */
  private reRaise(original: Escalation, target: Principal): void {
    const now = this.now();
    const durationMs =
      new Date(original.timeout_at).getTime() - new Date(original.created_at).getTime();
    const next: Escalation = {
      ...original,
      id: newId('esc'),
      routed_to_id: target.id,
      created_at: now.toISOString(),
      timeout_at: new Date(now.getTime() + durationMs).toISOString(),
      resolved_at: null,
      resolved_by_id: null,
      resolution: null,
      chosen_option_id: null,
      free_text: null,
    };
    this.store.putEscalation(next);
    const item = this.store.getWorkItem(original.work_item_id);
    if (item) void this.notify((b) => b.postEscalation(next, item));
    this.scheduleTimeout(next.id, durationMs / 1000);
  }

  /** An answered approval unblocks the item, unless another approval is still open on it. */
  private unblockAfterResolution(escalation: Escalation, resolver: Principal): void {
    if (escalation.kind !== 'approval') return;
    const item = this.store.getWorkItem(escalation.work_item_id);
    if (!item || item.state !== 'awaiting_approval') return;
    const stillOpen = this.store
      .openEscalations()
      .some((e) => e.work_item_id === item.id && e.kind === 'approval');
    if (!stillOpen) this.setState(item.id, 'running', null, resolver);
  }

  /** Wake a blocking caller and drop the timer. */
  private settle(escalation: Escalation): void {
    const timer = this.timers.get(escalation.id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(escalation.id);
    }
    const waiter = this.waiters.get(escalation.id);
    if (waiter) {
      this.waiters.delete(escalation.id);
      const waited =
        (new Date(escalation.resolved_at ?? escalation.created_at).getTime() -
          new Date(escalation.created_at).getTime()) /
        1000;
      waiter({
        resolution: escalation.resolution ?? 'withdrawn',
        chosen_option_id: escalation.chosen_option_id,
        free_text: escalation.free_text,
        resolved_by: escalation.resolved_by_id,
        waited_seconds: Math.round(waited),
      });
    }
  }

  /** Walk from the item's owner up the delegation chain to the accountable human. */
  private humanFor(item: WorkItem): Principal {
    let p = item.owner_id ? this.store.getPrincipal(item.owner_id) : undefined;
    while (p && p.kind !== 'human') {
      p = p.delegated_by ? this.store.getPrincipal(p.delegated_by) : undefined;
    }
    return p ?? this.defaultHuman;
  }

  private interruptsUsed(principalId: PrincipalId, now: Date): number {
    const log = this.interruptLog.get(principalId) ?? [];
    const cutoff = now.getTime() - 3_600_000;
    const recent = log.filter((t) => t > cutoff);
    this.interruptLog.set(principalId, recent);
    return recent.length;
  }

  private recordInterrupt(principalId: PrincipalId, now: Date): void {
    const log = this.interruptLog.get(principalId) ?? [];
    log.push(now.getTime());
    this.interruptLog.set(principalId, log);
  }

  private mustGetEscalation(id: string): Escalation {
    const e = this.store.getEscalation(id);
    if (!e) throw new Error(`unknown escalation: ${id}`);
    return e;
  }

  private async notify(fn: (b: EscalationBridge) => Promise<void>): Promise<void> {
    if (!this.bridge) return;
    try {
      await fn(this.bridge);
    } catch (err) {
      // Delivery failure must never take down the write path; the escalation
      // is still in the store and the owner's queue.
      console.error('escalation bridge delivery failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  protected mustGet(id: WorkItemId): WorkItem {
    const item = this.store.getWorkItem(id);
    if (!item) throw new Error(`unknown work item: ${id}`);
    return item;
  }

  protected assertBudgetFits(parent: WorkItem, childBudget: Budget | null): void {
    if (!parent.budget) return; // parent unbounded: nothing to narrow against
    const committed = this.store
      .children(parent.id)
      .reduce<Budget>((acc, c) => addBudget(acc, c.budget ?? {}), {});
    const remaining = remainingBudget(parent.budget, committed);
    if (!fitsWithin(childBudget ?? {}, remaining)) {
      throw new Error(
        `budget oversubscription: parent ${parent.id} has ${JSON.stringify(remaining)} remaining`,
      );
    }
  }

  protected appendEntry(
    work_item_id: WorkItemId,
    kind: EntryKind,
    body: string,
    author: Principal,
    payload: unknown | null,
    context_digest: string | null = null,
  ): TranscriptEntry {
    return this.store.appendEntry({
      work_item_id,
      kind,
      author_id: author.id,
      body,
      payload,
      context_digest,
    });
  }

  /** Recompute rollups from this item up to the root. Bounded by depth. */
  protected recomputeUp(work_item_id: WorkItemId): void {
    let current: WorkItem | undefined = this.store.getWorkItem(work_item_id);
    while (current) {
      const children = this.store.children(current.id);
      current.rollup = computeRollup(
        {
          state: current.state,
          blast_radius: current.blast_radius,
          consumed: current.consumed,
          budget: current.budget,
          deadline: current.deadline,
        },
        children.map((c) => c.rollup),
      );
      this.store.putWorkItem(current);
      current = current.parent_id ? this.store.getWorkItem(current.parent_id) : undefined;
    }
  }
}

// Re-exported for later tasks (escalations) and the MCP layer.
export type {
  Escalation,
  EscalationKind,
  EscalationOption,
  EscalationResolution,
  TimeoutAction,
};

export interface EscalateArgs {
  work_item_id: WorkItemId;
  kind: EscalationKind;
  question: string;
  options?: EscalationOption[];
  context_summary: string;
  blocking?: boolean;
  timeout_seconds?: number;
  timeout_action?: TimeoutAction;
}

/** What a blocking `work.escalate` returns; the agent branches on `resolution`. */
export interface EscalateOutcome {
  resolution: EscalationResolution;
  chosen_option_id: string | null;
  free_text: string | null;
  resolved_by: PrincipalId | null;
  waited_seconds: number;
}

function parseDate(iso: string | null): Date | null {
  return iso ? new Date(iso) : null;
}
