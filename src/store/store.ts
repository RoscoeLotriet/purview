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

export interface NewTranscriptEntry {
  work_item_id: WorkItemId;
  kind: EntryKind;
  author_id: PrincipalId;
  body: string;
  payload: unknown | null;
  context_digest: string | null;
}

/**
 * Persistence boundary. v0 ships MemoryStore; the durable target is Postgres
 * with ltree (db/schema.sql). Methods are synchronous because the memory
 * implementation is; a SQL adapter will change these to promises behind the
 * same shapes.
 */
export interface Store {
  // principals
  putPrincipal(p: Principal): void;
  getPrincipal(id: PrincipalId): Principal | undefined;
  findPrincipalByName(display_name: string): Principal | undefined;
  listPrincipals(): Principal[];

  // work items
  putWorkItem(item: WorkItem): void;
  getWorkItem(id: WorkItemId): WorkItem | undefined;
  getByIdempotencyKey(key: string): WorkItem | undefined;
  children(parentId: WorkItemId): WorkItem[];
  /** All items whose path is `rootPath` or a descendant, optionally at most `maxDepth` levels below it. */
  subtree(rootPath: string, maxDepth?: number): WorkItem[];
  itemsOwnedBy(principalId: PrincipalId): WorkItem[];

  // transcript
  appendEntry(entry: NewTranscriptEntry): TranscriptEntry;
  entries(workItemId: WorkItemId, kinds?: EntryKind[]): TranscriptEntry[];

  // escalations
  putEscalation(e: Escalation): void;
  getEscalation(id: EscalationId): Escalation | undefined;
  openEscalationsFor(principalId: PrincipalId): Escalation[];
  openEscalations(): Escalation[];
}
