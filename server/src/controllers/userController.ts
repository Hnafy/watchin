import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User, WatchHistory, WatchlistItem, Rating } from '../db/models';
import { AppError } from '../utils/AppError';

export const userController = {
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { username, email } = req.body;

      if (username) {
        const existing = await User.findOne({ username, _id: { $ne: userId } });
        if (existing) throw AppError.badRequest('Username already taken');
      }

      if (email) {
        const existing = await User.findOne({ email, _id: { $ne: userId } });
        if (existing) throw AppError.badRequest('Email already taken');
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { ...(username && { username }), ...(email && { email }) } },
        { new: true }
      ).select('id email username avatar role emailVerified createdAt');

      res.json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(userId).select('+passwordHash');
      if (!user) throw AppError.notFound('User not found');

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) throw AppError.badRequest('Current password is incorrect');

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await User.updateOne({ _id: userId }, { $set: { passwordHash } });

      res.json({ status: 'success', message: 'Password updated' });
    } catch (error) {
      next(error);
    }
  },

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const [watchCount, watchlistCount, ratingCount, distinctMedia, historyDays] = await Promise.all([
        WatchHistory.countDocuments({ userId }),
        WatchlistItem.countDocuments({ userId }),
        Rating.countDocuments({ userId }),
        WatchHistory.distinct('mediaId', { userId }),
        WatchHistory.distinct('watchedAt', { userId }),
      ]);

      // Streak: consecutive days with at least one watch event
      const days = [...new Set(
        historyDays.map((d: Date) => new Date(d).toISOString().slice(0, 10))
      )].sort();
      let streak = 0;
      const today = new Date().toISOString().slice(0, 10);
      const cursor = new Date(today);
      const daySet = new Set(days);
      if (daySet.has(today) || daySet.has(new Date(Date.now() - 86400000).toISOString().slice(0, 10))) {
        for (let i = 0; i < 366; i++) {
          const key = cursor.toISOString().slice(0, 10);
          if (daySet.has(key)) streak++;
          else break;
          cursor.setDate(cursor.getDate() - 1);
        }
      }

      res.json({
        status: 'success',
        data: {
          totalWatches: watchCount,
          watchlistCount,
          ratingCount,
          titlesWatched: distinctMedia.length,
          streakDays: streak,
          activityDays: days.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
