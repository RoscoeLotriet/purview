import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { PurviewService } from '../service/purview.js';
import type { EntryKind } from '../domain/types.js';

const budgetSchema = z
  .object({
    tokens: z.number().nonnegative().optional(),
    usd: z.number().nonnegative().optional(),
    wall_clock_seconds: z.number().nonnegative().optional(),
    tool_calls: z.number().nonnegative().optional(),
  })
  .optional();

const blastSchema = z.enum(['none', 'reversible', 'costly', 'irreversible']).optional();

const optionSchema = z.object({ id: z.string(), label: z.string() });

const childSchema = z.object({
  intent: z.string(),
  blast_radius: blastSchema,
  budget: budgetSchema,
  deadline: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

function jsonResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

/**
 * The spec §4 MCP surface. Every tool is something an agent does
 * mid-execution anyway; errors come back as isError text the agent can
 * branch on rather than protocol failures.
 */
export function buildMcpServer(service: PurviewService, principalName: string): McpServer {
  const server = new McpServer({ name: 'purview', version: '0.1.0' });
  const actor = () => service.ensureAgent(principalName);

  server.registerTool(
    'work_create',
    {
      description:
        'Create a work item (a root goal, or a child under parent_id). Requires an idempotency_key; retries are safe and return the existing item.',
      inputSchema: {
        parent_id: z.string().optional(),
        intent: z.string().describe('Immutable natural-language goal'),
        priority: z.number().min(0).max(1).optional(),
        blast_radius: blastSchema,
        budget: budgetSchema,
        deadline: z.string().optional(),
        labels: z.array(z.string()).optional(),
        idempotency_key: z.string(),
      },
    },
    async (args) => {
      try {
        return jsonResult(service.createWork(args, actor()));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'work_fan_out',
    {
      description:
        'Create N children atomically under a parent. Rejected outright if the batch would oversubscribe the parent budget.',
      inputSchema: {
        parent_id: z.string(),
        children: z.array(childSchema).min(1),
        idempotency_key: z.string(),
      },
    },
    async (args) => {
      try {
        return jsonResult({
          items: service.fanOut(args.parent_id, args.children, args.idempotency_key, actor()),
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'work_claim',
    {
      description:
        'Take ownership of a ready item and start running it. Declare your confidence (0..1) that you can complete it.',
      inputSchema: {
        work_item_id: z.string(),
        confidence: z.number().min(0).max(1).optional(),
      },
    },
    async (args) => {
      try {
        return jsonResult(service.claim(args.work_item_id, args.confidence ?? null, actor()));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'work_report',
    {
      description:
        'Append progress to the transcript: a note, a tool_call you made, or an artifact you produced. Include cost to record spend against the budget.',
      inputSchema: {
        work_item_id: z.string(),
        kind: z.enum(['note', 'tool_call', 'artifact']),
        body: z.string(),
        payload: z.unknown().optional(),
        cost: budgetSchema,
        context_digest: z.string().optional(),
      },
    },
    async (args) => {
      try {
        return jsonResult(
          service.report(
            args.work_item_id,
            {
              kind: args.kind,
              body: args.body,
              payload: args.payload,
              cost: args.cost,
              context_digest: args.context_digest ?? null,
            },
            actor(),
          ),
        );
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'work_set_state',
    {
      description:
        'Move an item to a new state. state_reason is required for blocked, failed and abandoned.',
      inputSchema: {
        work_item_id: z.string(),
        state: z.enum([
          'proposed',
          'ready',
          'running',
          'blocked',
          'awaiting_approval',
          'done',
          'failed',
          'abandoned',
        ]),
        state_reason: z.string().optional(),
      },
    },
    async (args) => {
      try {
        return jsonResult(
          service.setState(args.work_item_id, args.state, args.state_reason ?? null, actor()),
        );
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'work_escalate',
    {
      description:
        'Ask a human. Provide a question, small option set and a context_summary (<=280 chars) resolvable from a phone. With blocking=true this call waits for the answer or the timeout and returns a result you can branch on.',
      inputSchema: {
        work_item_id: z.string(),
        kind: z.enum(['approval', 'decision', 'input', 'exception']),
        question: z.string(),
        options: z.array(optionSchema).max(5).optional(),
        context_summary: z.string().max(280),
        blocking: z.boolean().optional(),
        timeout_seconds: z.number().positive().optional(),
        timeout_action: z.enum(['abort', 'proceed', 'escalate_up', 'fallback_owner']).optional(),
      },
    },
    async (args) => {
      try {
        return jsonResult(await service.escalate(args, actor()));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'work_complete',
    {
      description: 'Close an item as done, with an optional result summary and artifacts.',
      inputSchema: {
        work_item_id: z.string(),
        result: z.string().optional(),
        artifacts: z
          .array(z.object({ kind: z.string(), uri: z.string().nullable(), label: z.string() }))
          .optional(),
      },
    },
    async (args) => {
      try {
        return jsonResult(
          service.complete(args.work_item_id, args.result ?? null, args.artifacts ?? [], actor()),
        );
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'work_abandon',
    {
      description: 'Close an item unsuccessfully, with the reason.',
      inputSchema: {
        work_item_id: z.string(),
        reason: z.string(),
      },
    },
    async (args) => {
      try {
        return jsonResult(service.abandon(args.work_item_id, args.reason, actor()));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'work_query',
    {
      description:
        'Hydrate context: read a subtree at a depth (optionally attention-only), or pass principal_id to read a queue of owned items and open escalations. Defaults to your own queue when called with no arguments.',
      inputSchema: {
        work_item_id: z.string().optional(),
        principal_id: z.string().optional(),
        depth: z.number().int().positive().optional(),
        attention_only: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const query =
          args.work_item_id || args.principal_id ? args : { ...args, principal_id: actor().id };
        return jsonResult(service.query(query));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // --- resources (§4.2): read-only, URI-addressed ---
  // More specific templates are registered before the bare item template.

  server.registerResource(
    'workitem-tree',
    new ResourceTemplate('workitem://{id}/tree{?depth,attention_only}', { list: undefined }),
    { description: 'The altitude query: subtree at a maximum depth, optionally attention-only.' },
    async (uri, variables) => {
      const depth = variables.depth ? Number(variables.depth) : undefined;
      const attention_only = variables.attention_only === 'true';
      const result = service.query({
        work_item_id: String(variables.id),
        depth,
        attention_only,
      });
      return {
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(result) }],
      };
    },
  );

  server.registerResource(
    'workitem-provenance',
    new ResourceTemplate('workitem://{id}/provenance', { list: undefined }),
    { description: 'Context refs and digests for replay: what the owner read before deciding.' },
    async (uri, variables) => {
      const item = service.query({ work_item_id: String(variables.id) }).items[0];
      const digests = service
        .transcript(String(variables.id))
        .filter((e) => e.context_digest !== null)
        .map((e) => ({ seq: e.seq, context_digest: e.context_digest, created_at: e.created_at }));
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ provenance: item?.provenance ?? [], digests }),
          },
        ],
      };
    },
  );

  server.registerResource(
    'principal-queue',
    new ResourceTemplate('principal://{id}/queue', { list: undefined }),
    { description: 'Open items owned by this principal and escalations routed to them.' },
    async (uri, variables) => {
      const result = service.query({ principal_id: String(variables.id) });
      return {
        contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(result) }],
      };
    },
  );

  server.registerResource(
    'workitem',
    new ResourceTemplate('workitem://{id}', { list: undefined }),
    { description: 'A work item plus its recent transcript.' },
    async (uri, variables) => {
      const id = String(variables.id);
      const item = service.query({ work_item_id: id, depth: 0 }).items[0];
      const kinds: EntryKind[] = ['note', 'state_change', 'artifact', 'escalation', 'decision'];
      const transcript = service.transcript(id, kinds).slice(-50);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ item, transcript }),
          },
        ],
      };
    },
  );

  return server;
}
