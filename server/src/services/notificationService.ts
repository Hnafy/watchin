import { Notification } from '../db/models.js';

export interface CreateNotificationInput {
  userId: string;
  type: 'WELCOME' | 'SYSTEM' | 'ADMIN' | 'WATCHLIST' | 'RATING' | 'REPLY' | 'MENTION' | 'CONTENT' | 'MESSAGE' | 'REPORT' | 'WARNING';
  title: string;
  body?: string | null;
  link?: string | null;
  relatedId?: string | null;
  relatedUserId?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  return Notification.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    relatedId: input.relatedId ?? null,
    relatedUserId: input.relatedUserId ?? null,
  });
}

export async function notifyMany(recipients: string[], input: Omit<CreateNotificationInput, 'userId'>) {
  if (!recipients.length) return;
  await Notification.insertMany(
    recipients.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      relatedId: input.relatedId ?? null,
      relatedUserId: input.relatedUserId ?? null,
    }))
  );
}
