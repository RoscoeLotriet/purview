import { addBudget, fitsWithin, remainingBudget } from '../domain/budget.js';
import { newId, newPathSegment } from '../domain/ids.js';
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
