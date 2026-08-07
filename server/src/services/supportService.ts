import { config } from '../config/index.js';

export interface DiscordPayload {
  username?: string;
  avatar_url?: string;
  embeds: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    footer?: { text: string };
    timestamp?: string;
  }>;
}

/** Posts a message to a Discord webhook. Returns false when the webhook is missing or the request fails. */
export async function sendToDiscord(webhookUrl: string, payload: DiscordPayload): Promise<boolean> {
  if (!webhookUrl) return false;
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: payload.username || config.discord.username,
        avatar_url: payload.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png',
        embeds: payload.embeds,
      }),
    });
    if (!res.ok) {
      console.error(`Discord webhook failed: ${res.status} ${res.statusText}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Discord webhook error:', err);
    return false;
  }
}

function truncate(value: string, max = 1024): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

const CONTACT_COLOR = 0x7c3aed; // violet
const REPORT_COLOR = 0xef4444; // red

export const supportService = {
  async contactAdmin(input: {
    message: string;
    subject?: string;
    pageUrl?: string;
    username?: string;
    email?: string;
  }) {
    const webhook = config.discord.supportWebhook;
    if (!webhook) return false;

    const delivered = await sendToDiscord(webhook, {
      embeds: [
        {
          title: '🎬 Watchin — Contact Admin',
          color: CONTACT_COLOR,
          timestamp: new Date().toISOString(),
          fields: [
            { name: 'User', value: truncate(input.username || 'Guest'), inline: true },
            { name: 'Email', value: truncate(input.email || 'Not logged in'), inline: true },
            { name: 'Page', value: truncate(input.pageUrl || '—'), inline: false },
            { name: 'Subject', value: truncate(input.subject || '—'), inline: true },
            { name: 'Message', value: truncate(input.message || '—'), inline: false },
          ],
        },
      ],
    });

    return delivered;
  },

  async commentReport(input: {
    commentId: string;
    commentContent: string;
    commentAuthor: string;
    mediaTitle: string;
    reporter: string;
    reason: string;
    pageUrl?: string;
    reportCount: number;
  }) {
    const webhook = config.discord.reportWebhook || config.discord.supportWebhook;
    if (!webhook) return false;

    const delivered = await sendToDiscord(webhook, {
      embeds: [
        {
          title: '🚩 Watchin — Comment Reported',
          color: REPORT_COLOR,
          timestamp: new Date().toISOString(),
          fields: [
            { name: 'Reported by', value: truncate(input.reporter), inline: true },
            { name: 'Reason', value: truncate(input.reason || '—'), inline: true },
            { name: 'Comment author', value: truncate(input.commentAuthor), inline: true },
            { name: 'Film', value: truncate(input.mediaTitle || '—'), inline: true },
            { name: 'Comment', value: truncate(input.commentContent, 1800), inline: false },
            { name: 'Page', value: truncate(input.pageUrl || '—'), inline: false },
            { name: 'Total reports', value: String(input.reportCount), inline: true },
          ],
          footer: { text: `Comment ID: ${input.commentId}` },
        },
      ],
    });

    return delivered;
  },
};
