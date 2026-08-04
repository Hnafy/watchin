import { Request, Response, NextFunction } from 'express';
import { Notification } from '../db/models.js';

export const notificationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const limit = Math.min(Number(req.query.limit) || 20, 50);

      const [items, unread] = await Promise.all([
        Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit),
        Notification.countDocuments({ userId, read: false }),
      ]);

      res.json({ status: 'success', data: { items, unread } });
    } catch (error) {
      next(error);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const result = await Notification.updateOne(
        { _id: id, userId },
        { $set: { read: true } }
      );

      res.json({ status: 'success', data: { modified: result.modifiedCount } });
    } catch (error) {
      next(error);
    }
  },

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
      res.json({ status: 'success', data: { modified: 1 } });
    } catch (error) {
      next(error);
    }
  },
};
