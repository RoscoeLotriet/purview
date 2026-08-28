import { newId } from '../domain/ids.js';
import type {
  EntryKind,
  Escalation,
  EscalationId,
  Principal,
  PrincipalId,
  TranscriptEntry,
  WorkItem,
  WorkItemId,
} from '../domain/types.js';
import type { NewTranscriptEntry, Store } from './store.js';

/** In-memory store for the v0 slice. State does not survive a restart. */
export class MemoryStore implements Store {
  private principals = new Map<PrincipalId, Principal>();
  private items = new Map<WorkItemId, WorkItem>();
  private idempotency = new Map<string, WorkItemId>();
  private transcript = new Map<WorkItemId, TranscriptEntry[]>();
  private escalations = new Map<EscalationId, Escalation>();

  putPrincipal(p: Principal): void {
    this.principals.set(p.id, p);
  }

  getPrincipal(id: PrincipalId): Principal | undefined {
    return this.principals.get(id);
  }

  findPrincipalByName(display_name: string): Principal | undefined {
    for (const p of this.principals.values()) {
      if (p.display_name === display_name) return p;
    }
    return undefined;
  }

  listPrincipals(): Principal[] {
    return [...this.principals.values()];
  }

  putWorkItem(item: WorkItem): void {
    this.items.set(item.id, item);
    if (item.idempotency_key) this.idempotency.set(item.idempotency_key, item.id);
  }

  getWorkItem(id: WorkItemId): WorkItem | undefined {
    return this.items.get(id);
  }

  getByIdempotencyKey(key: string): WorkItem | undefined {
    const id = this.idempotency.get(key);
    return id ? this.items.get(id) : undefined;
  }

  children(parentId: WorkItemId): WorkItem[] {
    return [...this.items.values()].filter((i) => i.parent_id === parentId);
  }

  subtree(rootPath: string, maxDepth?: number): WorkItem[] {
    const rootDepth = rootPath.split('.').length - 1;
    return [...this.items.values()].filter((i) => {
      if (i.path !== rootPath && !i.path.startsWith(rootPath + '.')) return false;
      return maxDepth === undefined || i.depth - rootDepth <= maxDepth;
    });
  }

  itemsOwnedBy(principalId: PrincipalId): WorkItem[] {
    return [...this.items.values()].filter((i) => i.owner_id === principalId);
  }

  appendEntry(entry: NewTranscriptEntry): TranscriptEntry {
    const list = this.transcript.get(entry.work_item_id) ?? [];
    const full: TranscriptEntry = {
      id: newId('te'),
      seq: list.length + 1,
      created_at: new Date().toISOString(),
      ...entry,
    };
    list.push(full);
    this.transcript.set(entry.work_item_id, list);
    return full;
  }

  entries(workItemId: WorkItemId, kinds?: EntryKind[]): TranscriptEntry[] {
    const list = this.transcript.get(workItemId) ?? [];
    return kinds ? list.filter((e) => kinds.includes(e.kind)) : [...list];
  }

  putEscalation(e: Escalation): void {
    this.escalations.set(e.id, e);
  }

  getEscalation(id: EscalationId): Escalation | undefined {
    return this.escalations.get(id);
  }

  openEscalationsFor(principalId: PrincipalId): Escalation[] {
    return this.openEscalations().filter((e) => e.routed_to_id === principalId);
  }

  openEscalations(): Escalation[] {
    return [...this.escalations.values()].filter((e) => e.resolved_at === null);
  }
}
