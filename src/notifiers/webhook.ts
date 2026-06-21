import * as crypto from 'crypto';
import axios from 'axios';
import { config } from '../config';
import type { PresenceGame } from '../api/presence';

export type WebhookEvent = 'game_started' | 'game_stopped';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  game: PresenceGame;
}

export async function sendWebhook(event: WebhookEvent, game: PresenceGame): Promise<void> {
  if (!config.webhookUrl) return;

  const payload: WebhookPayload = { event, timestamp: new Date().toISOString(), game };
  const body = JSON.stringify(payload);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (config.webhookSecret) {
    const sig = crypto.createHmac('sha256', config.webhookSecret).update(body).digest('hex');
    headers['X-Hub-Signature-256'] = `sha256=${sig}`;
  }

  await axios.post(config.webhookUrl, payload, { headers });
}
