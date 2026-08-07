import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User, RefreshToken, WatchHistory, WatchlistItem, WatchlistFolder, Rating, Notification } from '../db/models.js';
import { escapeRegex } from '../db/utils.js';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/index.js';

function flattenSettings(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenSettings(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

async function createNotification(
  recipientId: string,
  senderId: string,
  type: string,
  title: string,
  link?: string
) {
  const sender = await User.findById(senderId).select('username');
  await Notification.create({
    userId: recipientId,
    type,
    title,
    body: sender ? `${sender.username} ${type.toLowerCase().replace('_', ' ')}` : title,
    link,
    relatedUserId: senderId,
  });
}

async function getUsername(id: string): Promise<string> {
  const u = await User.findById(id).select('username');
  return u?.username ?? 'Someone';
}

export const userController = {
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const user = await User.findById(userId).select('settings');
      res.json({ status: 'success', data: user?.settings || {} });
    } catch (error) {
      next(error);
    }
  },

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const updates = req.body as Record<string, any>;
      const set: Record<string, any> = {};
      for (const [key, value] of Object.entries(flattenSettings(updates))) {
        set[`settings.${key}`] = value;
      }
      const user = await User.findByIdAndUpdate(userId, { $set: set }, { new: true }).select('settings');
      res.json({ status: 'success', data: user?.settings || {} });
    } catch (error) {
      next(error);
    }
  },

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      await Promise.all([
        User.deleteOne({ _id: userId }),
        RefreshToken.deleteMany({ userId }),
        WatchHistory.deleteMany({ userId }),
        WatchlistItem.deleteMany({ userId }),
        WatchlistFolder.deleteMany({ userId }),
        Rating.deleteMany({ userId }),
        Notification.deleteMany({ $or: [{ userId: userId }, { relatedUserId: userId }] }),
      ]);
      res.json({ status: 'success', message: 'Account deleted' });
    } catch (error) {
      next(error);
    }
  },

  // Public profile (optionally authenticated)
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = req.params;
      const viewerId = (req as any).user?.id || null;

      const user = await User.findOne({ username }).select('id username avatar role emailVerified createdAt');
      if (!user) throw AppError.notFound('User not found');
      const userId = (user as any)._id;

      const [watchCount, watchlistCount, ratingCount] = await Promise.all([
        WatchHistory.countDocuments({ userId }),
        WatchlistItem.countDocuments({ userId }),
        Rating.countDocuments({ userId }),
      ]);

      res.json({
        status: 'success',
        data: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          stats: {
            totalWatches: watchCount,
            watchlistCount,
            ratingCount,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Search users (optionally authenticated)
  async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (typeof req.query.q === 'string' ? req.query.q : '').trim();
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Number(req.query.limit) || 20);

      const where: any = {};
      if (q) {
        where.$or = [
          { username: { $regex: escapeRegex(q), $options: 'i' } },
        ];
      }

      const [users, total] = await Promise.all([
        User.find(where)
          .select('id username avatar role createdAt')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        User.countDocuments(where),
      ]);

      const data = users.map((u: any) => ({
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        role: u.role,
        createdAt: u.createdAt,
      }));

      res.json({
        status: 'success',
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  },

  // Avatar upload
  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { image } = req.body as { image: string };

      if (!config.imgbb.apiKey) throw AppError.badGateway('Image upload service is not configured');

      const match = /^data:(image\/[a-zA-Z]+);base64,(.+)$/.exec(image);
      if (!match) throw AppError.badRequest('Invalid image data');
      const mime = match[1];
      if (!config.upload.allowedMimeTypes.includes(mime)) {
        throw AppError.badRequest('Only JPG, PNG, or WebP images are allowed');
      }
      const base64 = match[2];
      const sizeBytes = Math.floor((base64.length * 3) / 4);
      if (sizeBytes > config.upload.maxFileSize) {
        throw AppError.badRequest('Image exceeds the 10MB limit');
      }

      const form = new FormData();
      form.append('key', config.imgbb.apiKey);
      form.append('image', base64);

      const response = await fetch(config.imgbb.baseUrl, { method: 'POST', body: form });
      const json: any = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success || !json?.data) {
        throw AppError.badGateway(json?.error?.message || 'Image upload failed');
      }

      const avatarUrl = json.data.display_url || json.data.url;
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { avatar: avatarUrl } },
        { new: true }
      ).select('id email username avatar role emailVerified createdAt');

      res.json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  },

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
      if (!user.passwordHash) throw AppError.badRequest('This account uses Google sign-in and has no password');

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