import { Response, NextFunction } from 'express';
import { TrendingMedia, AdEvent, BlockedEmail, User, Comment } from '../db/models.js';
import { analyticsService } from '../services/analyticsService.js';
import { adminService } from '../services/adminService.js';
import { commentService } from '../services/commentService.js';
import { commentSettingsService } from '../services/commentSettingsService.js';
import { createNotification } from '../services/notificationService.js';
import { sendMessageEmail } from '../services/emailService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const adminController = {
  // --- Stats & Analytics ---
  async getDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await analyticsService.getDashboardStats();
      res.json({ status: 'success', data: stats });
    } catch (error) { next(error); }
  },

  async getViewsChart(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await analyticsService.getViewsByDay(days);
      res.json({ status: 'success', data });
    } catch (error) { next(error); }
  },

  // --- All Media Management ---
  async getAllMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search, type } = req.query;
      const result = await analyticsService.getAllMedia(
        parseInt(page as string), parseInt(limit as string),
        search as string, type as string
      );
      res.json({ status: 'success', ...result });
    } catch (error) { next(error); }
  },

  async getMediaAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getMediaAnalytics(req.params.id);
      if (!data) return res.status(404).json({ status: 'error', message: 'Not found' });
      res.json({ status: 'success', data });
    } catch (error) { next(error); }
  },

  async deleteMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const deleted = await analyticsService.deleteMedia(req.params.id);
      if (!deleted) return res.status(404).json({ status: 'error', message: 'Media not found' });
      res.json({ status: 'success', message: 'Media deleted' });
    } catch (error) { next(error); }
  },

  // --- User Management ---
  async getAllUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const result = await analyticsService.getAllUsers(
        parseInt(page as string), parseInt(limit as string), search as string
      );
      res.json({ status: 'success', ...result });
    } catch (error) { next(error); }
  },

  async updateUserRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await analyticsService.updateUserRole(req.params.id, req.body.role);
      res.json({ status: 'success', data: user });
    } catch (error) { next(error); }
  },

  async deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.params.id === req.user!.id) {
        return res.status(400).json({ status: 'error', message: 'Cannot delete yourself' });
      }
      await analyticsService.deleteUser(req.params.id);
      res.json({ status: 'success', message: 'User deleted' });
    } catch (error) { next(error); }
  },

  // --- Hero Slides (auto from trending) ---
  async getHeroSlides(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const trending = await TrendingMedia.find({ period: 'week' })
        .sort({ rank: 1 })
        .limit(20)
        .populate('media');
      res.json({ status: 'success', data: trending.map((t: any) => t.media).filter(Boolean) });
    } catch (error) { next(error); }
  },

  // --- Site Settings ---
  async getSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { group } = req.query;
      const settings = await analyticsService.getSettings(group as string);
      res.json({ status: 'success', data: settings });
    } catch (error) { next(error); }
  },

  async updateSetting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { key, value, label, group } = req.body;
      const setting = await analyticsService.updateSetting(key, value, label, group);
      res.json({ status: 'success', data: setting });
    } catch (error) { next(error); }
  },

  // --- Ad monetization stats ---
  async getAdsStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 90);
      const since = new Date();
      since.setDate(since.getDate() - days);

      const events = await AdEvent.find({ createdAt: { $gte: since } })
        .select('zone type createdAt')
        .lean();

      const byZone = new Map<string, { impressions: number; clicks: number }>();
      const byDay = new Map<string, { impressions: number; clicks: number }>();
      let totalImpressions = 0;
      let totalClicks = 0;

      for (const e of events) {
        const key = e.zone;
        const day = e.createdAt.toISOString().slice(0, 10);
        const z = byZone.get(key) ?? { impressions: 0, clicks: 0 };
        const d = byDay.get(day) ?? { impressions: 0, clicks: 0 };
        if (e.type === 'IMPRESSION') { z.impressions++; d.impressions++; totalImpressions++; }
        else if (e.type === 'CLICK') { z.clicks++; d.clicks++; totalClicks++; }
        byZone.set(key, z);
        byDay.set(day, d);
      }

      const CPM = 1.25;
      const revenue = (totalImpressions / 1000) * CPM;

      res.json({
        status: 'success',
        data: {
          totals: {
            impressions: totalImpressions,
            clicks: totalClicks,
            ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
            revenue,
            cpm: CPM,
          },
          byZone: Array.from(byZone.entries()).map(([zone, v]) => ({ zone, ...v, ctr: v.impressions > 0 ? v.clicks / v.impressions : 0 })),
          byDay: Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v })),
        },
      });
    } catch (error) { next(error); }
  },

  // --- Direct Media Management (for editing actual Media records) ---
  async getMediaForEdit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const media = await adminService.getMediaById(req.params.id);
      if (!media) return res.status(404).json({ status: 'error', message: 'Not found' });
      res.json({ status: 'success', data: media });
    } catch (error) { next(error); }
  },

  async updateMediaRecord(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const media = await adminService.updateMediaRecord(req.params.id, req.body);
      res.json({ status: 'success', data: media });
    } catch (error) { next(error); }
  },

  // --- Pending Media (legacy) ---
  async getPendingMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await adminService.getPendingMedia(parseInt(page as string), parseInt(limit as string));
      res.json({ status: 'success', ...result });
    } catch (error) { next(error); }
  },

  async getMediaDetail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const media = await adminService.getMediaDetail(req.params.id);
      if (!media) return res.status(404).json({ status: 'error', message: 'Not found' });
      res.json({ status: 'success', data: media });
    } catch (error) { next(error); }
  },

  async createMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const media = await adminService.createMedia(req.body, req.user!.id);
      res.status(201).json({ status: 'success', data: media });
    } catch (error) { next(error); }
  },

  async updateMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const media = await adminService.updateMedia(req.params.id, req.body, req.user!.id);
      res.json({ status: 'success', data: media });
    } catch (error) { next(error); }
  },

  async approveMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const media = await adminService.approveMedia(req.params.id, req.user!.id);
      res.json({ status: 'success', data: media });
    } catch (error) { next(error); }
  },

  async createSeries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const media = await adminService.createSeries(req.body);
      res.status(201).json({ status: 'success', data: media });
    } catch (error) { next(error); }
  },

  async rejectMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await adminService.rejectMedia(req.params.id, req.user!.id);
      res.json({ status: 'success', message: 'Media rejected' });
    } catch (error) { next(error); }
  },

  // --- Comment Moderation ---
  async getAllComments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = typeof req.query.search === 'string' ? req.query.search : '';
      const filter = typeof req.query.filter === 'string' ? req.query.filter : 'all';
      const result = await commentService.getAll(page, limit, search, filter);
      res.json({ status: 'success', ...result });
    } catch (error) { next(error); }
  },

  async deleteComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await commentService.remove(req.params.id, req.user!.id, req.user!.role);
      res.json({ status: 'success', message: 'Comment deleted' });
    } catch (error) { next(error); }
  },

  // --- Comment Settings ---
  async getCommentSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const settings = await commentSettingsService.get();
      res.json({ status: 'success', data: settings });
    } catch (error) { next(error); }
  },

  async updateCommentSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { key, value } = req.body ?? {};
      if (!key || typeof key !== 'string') {
        return res.status(400).json({ status: 'error', message: 'Setting key is required' });
      }
      const settings = await commentSettingsService.update(key, value);
      res.json({ status: 'success', data: settings });
    } catch (error) { next(error); }
  },

  async setCommentHidden(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await commentService.setHidden(req.params.id, Boolean(req.body?.hidden));
      res.json({ status: 'success', message: 'Comment updated' });
    } catch (error) { next(error); }
  },

  // --- User Management ---
  async updateUserVerified(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.params.id === req.user?.id) {
        return res.status(400).json({ status: 'error', message: 'You cannot change your own verification status' });
      }
      const user = await analyticsService.updateUserVerified(req.params.id, Boolean(req.body?.emailVerified));
      if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
      res.json({ status: 'success', data: user });
    } catch (error) { next(error); }
  },

  // --- Admin → User Messages ---
  async sendUserMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const title = String(req.body?.title || 'Message from Watchin').trim().slice(0, 120);
      const body = String(req.body?.body || '').trim().slice(0, 2000);
      if (!body) {
        return res.status(400).json({ status: 'error', message: 'Message body is required' });
      }
      const user = await User.findById(req.params.id).select('username email');
      if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

      const sender = await User.findById(req.user!.id).select('username role');
      const senderName = sender?.role === 'ADMIN' ? 'Watchin Admin' : (sender?.username || 'Watchin Team');

      await createNotification({
        userId: user.id,
        type: 'MESSAGE',
        title,
        body,
        link: '/notifications',
        relatedUserId: req.user!.id,
      });

      sendMessageEmail(user.email, title, body, senderName).catch(() => {});

      res.json({ status: 'success', message: 'Message sent' });
    } catch (error) { next(error); }
  },

  // --- Warn (alarm) a user for false reports ---
  async warnUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.params.id === req.user?.id) {
        return res.status(400).json({ status: 'error', message: 'You cannot warn yourself' });
      }
      const reason = String(req.body?.reason || 'Repeated false reports').trim().slice(0, 300);
      const result = await analyticsService.warnUser(req.params.id, req.user!.id, reason);
      if (!result) return res.status(404).json({ status: 'error', message: 'User not found' });
      res.json({ status: 'success', data: result });
    } catch (error) { next(error); }
  },

  // --- Warn all reporters of a comment that was judged not problematic ---
  async warnCommentReporters(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const comment = await Comment.findById(req.params.commentId).select('reports');
      if (!comment) return res.status(404).json({ status: 'error', message: 'Comment not found' });

      const reporterIds = [
        ...new Set((comment.reports || []).map((r: any) => String(r.user)).filter(Boolean)),
      ];
      if (!reporterIds.length) {
        return res.status(400).json({ status: 'error', message: 'No reporters on this comment' });
      }

      const warned: Array<{ user: string; warningCount: number; banned: boolean; deleted: boolean }> = [];
      for (const uid of reporterIds) {
        const result = await analyticsService.warnUser(uid, req.user!.id, 'Filed a report against a comment that broke no rules');
        if (result) warned.push({ user: uid, ...result });
      }

      res.json({ status: 'success', data: { warned } });
    } catch (error) { next(error); }
  },

  // --- Blocked Emails ---
  async getBlockedEmails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const list = await BlockedEmail.find().sort({ createdAt: -1 }).lean();
      res.json({ status: 'success', data: list });
    } catch (error) { next(error); }
  },

  async addBlockedEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ status: 'error', message: 'Valid email required' });
      }
      const existing = await BlockedEmail.findOne({ email });
      if (existing) {
        return res.status(400).json({ status: 'error', message: 'Email is already blocked' });
      }
      const entry = await BlockedEmail.create({
        email,
        note: String(req.body?.note || '').trim() || null,
        blockedBy: req.user!.id,
      });
      res.status(201).json({ status: 'success', data: entry });
    } catch (error) { next(error); }
  },

  async removeBlockedEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await BlockedEmail.findByIdAndDelete(req.params.id);
      res.json({ status: 'success', message: 'Email unblocked' });
    } catch (error) { next(error); }
  },
};
