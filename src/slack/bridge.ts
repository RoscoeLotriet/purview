import type { Escalation, WorkItem } from '../domain/types.js';
import type { EscalationBridge } from '../service/purview.js';
import { digestBlocks, escalationBlocks, resolvedBlocks } from './blocks.js';

export interface SlackBridgeOptions {
  /** Incoming-webhook URL for the escalation channel. Unset: log-only mode. */
  webhookUrl?: string;
}

/**
 * Renders escalations into Slack with option buttons (product spec D3).
 * Interactivity responses come back through /slack/interactions; resolved
 * cards are updated in place via the interaction's response_url.
 */
export class SlackBridge implements EscalationBridge {
  private readonly webhookUrl: string | undefined;

  constructor(opts: SlackBridgeOptions) {
    this.webhookUrl = opts.webhookUrl;
  }

  async postEscalation(escalation: Escalation, item: WorkItem): Promise<void> {
    await this.send(this.webhookUrl, {
      text: escalation.question,
      blocks: escalationBlocks(escalation, item),
    });
  }

  /**
   * Without a response_url (e.g. a timeout) there is no message to update;
   * the outcome is still in the transcript and the owner's queue.
   */
  async postResolution(escalation: Escalation, responseUrl?: string): Promise<void> {
    if (!responseUrl) return;
    await this.send(responseUrl, {
      replace_original: true,
      text: escalation.question,
      blocks: resolvedBlocks(escalation),
    });
  }

  async postDigest(escalations: Escalation[]): Promise<void> {
    if (escalations.length === 0) return;
    await this.send(this.webhookUrl, {
      text: `Purview digest — ${escalations.length} item(s)`,
      blocks: digestBlocks(escalations),
    });
  }

  private async send(url: string | undefined, body: unknown): Promise<void> {
    if (!url) {
      console.log('[slack:off]', JSON.stringify(body));
      return;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Slack delivery failed: ${res.status} ${await res.text()}`);
    }
  }
}
