import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { type Express, type Request, type Response } from 'express';
import { buildMcpServer } from '../mcp/server.js';
import type { PurviewService } from '../service/purview.js';
import type { SlackBridge } from '../slack/bridge.js';
import { parseInteraction } from '../slack/interactions.js';
import { verifySlackSignature } from '../slack/verify.js';

export interface AppOptions {
  /** Slack signing secret. Unset: interaction signatures are not enforced (dev mode). */
  signingSecret?: string;
  /** Used to update the Slack card in place via the interaction's response_url. */
  slackBridge?: SlackBridge;
}

/**
 * One process, three surfaces: MCP over streamable HTTP at /mcp (many agents,
 * one shared work graph), Slack interactivity at /slack/interactions, and
 * /healthz. Stateless MCP mode: each POST gets a short-lived protocol server
 * bound to the shared PurviewService.
 */
export function buildApp(service: PurviewService, opts: AppOptions = {}): Express {
  const app = express();

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/mcp', express.json({ limit: '4mb' }), async (req: Request, res: Response) => {
    const principalHeader = req.headers['x-purview-principal'];
    const principalName =
      (Array.isArray(principalHeader) ? principalHeader[0] : principalHeader) ?? 'anonymous-agent';
    const server = buildMcpServer(service, principalName);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('mcp request failed:', err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'internal server error' },
          id: null,
        });
      }
    }
  });

  const methodNotAllowed = (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'method not allowed in stateless mode' },
      id: null,
    });
  };
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  app.post(
    '/slack/interactions',
    express.raw({ type: () => true, limit: '1mb' }),
    async (req: Request, res: Response) => {
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';

      if (opts.signingSecret) {
        const timestamp = String(req.headers['x-slack-request-timestamp'] ?? '');
        const signature = String(req.headers['x-slack-signature'] ?? '');
        const valid = verifySlackSignature({
          signingSecret: opts.signingSecret,
          timestamp,
          rawBody,
          signature,
        });
        if (!valid) {
          res.status(401).send('invalid signature');
          return;
        }
      }

      // Acknowledge fast; Slack expects a response within 3 seconds.
      res.status(200).send('');

      const payloadJson = new URLSearchParams(rawBody).get('payload');
      if (!payloadJson) return;
      const interaction = parseInteraction(payloadJson);
      if (!interaction) return;

      try {
        const resolver =
          service
            .listPrincipals()
            .find((p) => p.kind === 'human' && p.display_name === interaction.user_name) ??
          service.defaultHuman;
        const escalation = service.resolveEscalation(interaction.escalation_id, {
          chosen_option_id: interaction.option_id,
          resolver,
        });
        if (opts.slackBridge && interaction.response_url) {
          await opts.slackBridge.postResolution(escalation, interaction.response_url);
        }
      } catch (err) {
        // A second tap on an already-resolved card is expected; anything else is logged.
        console.warn('slack interaction not applied:', err);
      }
    },
  );

  return app;
}
