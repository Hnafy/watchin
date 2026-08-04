import { Response, NextFunction } from 'express';
import { watchlistService } from '../services/watchlistService';
import { AuthRequest } from '../middleware/authMiddleware';

export const watchlistController = {
  async getWatchlist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await watchlistService.getWatchlist(req.user!.id, parseInt(page as string), parseInt(limit as string));
      res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  },

  async addToWatchlist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = await watchlistService.addToWatchlist(req.user!.id, req.body.mediaId);
      res.json({ status: 'success', data: item });
    } catch (error) {
      next(error);
    }
  },

  async removeFromWatchlist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await watchlistService.removeFromWatchlist(req.user!.id, req.params.mediaId);
      res.json({ status: 'success', message: 'Removed from watchlist' });
    } catch (error) {
      next(error);
    }
  },

  async checkWatchlist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const inWatchlist = await watchlistService.isInWatchlist(req.user!.id, req.params.mediaId);
      res.json({ status: 'success', data: { inWatchlist } });
    } catch (error) {
      next(error);
    }
  },

  async clearWatchlist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await watchlistService.clearWatchlist(req.user!.id);
      res.json({ status: 'success', message: 'Watchlist cleared' });
    } catch (error) {
      next(error);
    }
  },
};