import { Response, NextFunction } from 'express';
import { watchHistoryService } from '../services/watchHistoryService';
import { AuthRequest } from '../middleware/authMiddleware';

export const watchHistoryController = {
  async updateProgress(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { mediaId, progress, duration, episodeId, seasonNumber, episodeNumber } = req.body;
      const history = await watchHistoryService.updateProgress(req.user!.id, mediaId, progress, duration, episodeId, seasonNumber, episodeNumber);
      res.json({ status: 'success', data: history });
    } catch (error) {
      next(error);
    }
  },

  async getContinueWatching(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { limit = 10 } = req.query;
      const data = await watchHistoryService.getContinueWatching(req.user!.id, parseInt(limit as string));
      res.json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  },

  async getWatchHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await watchHistoryService.getWatchHistory(req.user!.id, parseInt(page as string), parseInt(limit as string));
      res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  },

  async markCompleted(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { episodeId } = req.body;
      await watchHistoryService.markCompleted(req.user!.id, req.params.mediaId, episodeId);
      res.json({ status: 'success', message: 'Marked as completed' });
    } catch (error) {
      next(error);
    }
  },

  async deleteHistoryItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await watchHistoryService.deleteHistoryItem(req.user!.id, req.params.historyId);
      res.json({ status: 'success', message: 'History item deleted' });
    } catch (error) {
      next(error);
    }
  },

  async clearAllHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await watchHistoryService.clearAllHistory(req.user!.id);
      res.json({ status: 'success', message: 'Watch history cleared' });
    } catch (error) {
      next(error);
    }
  },
};