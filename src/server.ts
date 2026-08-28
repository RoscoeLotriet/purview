import { buildApp } from './http/app.js';
import { PurviewService } from './service/purview.js';
import { SlackBridge } from './slack/bridge.js';
import { MemoryStore } from './store/memory.js';

const port = Number(process.env.PORT ?? 8788);
const humanName = process.env.PURVIEW_HUMAN ?? 'operator';
const webhookUrl = process.env.SLACK_WEBHOOK_URL;
const signingSecret = process.env.SLACK_SIGNING_SECRET;
const digestIntervalMs = Number(process.env.DIGEST_INTERVAL_MS ?? 0);

const store = new MemoryStore();
const bridge = new SlackBridge({ webhookUrl });
const service = new PurviewService({ store, bridge, humanName });
const app = buildApp(service, { signingSecret, slackBridge: bridge });

const server = app.listen(port, () => {
  console.log(`purview listening on :${port}`);
  console.log(`  mcp endpoint       POST http://localhost:${port}/mcp`);
  console.log(`  slack interactions POST http://localhost:${port}/slack/interactions`);
  console.log(`  accountable human  ${service.defaultHuman.display_name}`);
  if (!webhookUrl) console.log('  slack              not configured (SLACK_WEBHOOK_URL unset); logging escalations');
});

let digestTimer: NodeJS.Timeout | undefined;
if (digestIntervalMs > 0) {
  digestTimer = setInterval(() => {
    void service.flushDigest().catch((err) => console.error('digest flush failed:', err));
  }, digestIntervalMs);
  digestTimer.unref();
}

function shutdown(): void {
  if (digestTimer) clearInterval(digestTimer);
  service.shutdown();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
