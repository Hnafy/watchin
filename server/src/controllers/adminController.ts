import { Response, NextFunction } from 'express';
import { TrendingMedia, AdEvent } from '../db/models.js';
import { analyticsService } from '../services/analyticsService.js';
import { adminService } from '../services/adminService.js';
import { commentService } from '../services/commentService.js';
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
      const result = await commentService.getAll(page, limit, search);
      res.json({ status: 'success', ...result });
    } catch (error) { next(error); }
  },

  async deleteComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await commentService.remove(req.params.id, req.user!.id, req.user!.role);
      res.json({ status: 'success', message: 'Comment deleted' });
    } catch (error) { next(error); }
  },
};
