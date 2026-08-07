import { Response, NextFunction } from 'express';
import { watchlistService } from '../services/watchlistService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const watchlistController = {
  async getWatchlist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const folderId = typeof req.query.folderId === 'string' ? req.query.folderId : undefined;
      const result = await watchlistService.getWatchlist(req.user!.id, parseInt(page as string), parseInt(limit as string), folderId);
      res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  },

  async addToWatchlist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = await watchlistService.addToWatchlist(req.user!.id, req.body.mediaId, req.body.folderId ?? null);
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

  // --- Folders ---
  async getFolders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await watchlistService.getFolders(req.user!.id);
      res.json({ status: 'success', data: result });
    } catch (error) { next(error); }
  },

  async createFolder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const folder = await watchlistService.createFolder(req.user!.id, req.body.name, req.body.icon ?? null);
      res.status(201).json({ status: 'success', data: folder });
    } catch (error) { next(error); }
  },

  async renameFolder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const folder = await watchlistService.renameFolder(req.user!.id, req.params.folderId, req.body.name, req.body.icon);
      res.json({ status: 'success', data: folder });
    } catch (error) { next(error); }
  },

  async deleteFolder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await watchlistService.deleteFolder(req.user!.id, req.params.folderId);
      res.json({ status: 'success', message: 'Folder deleted' });
    } catch (error) { next(error); }
  },

  async moveToFolder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = await watchlistService.moveToFolder(req.user!.id, req.params.mediaId, req.body.folderId ?? null);
      res.json({ status: 'success', data: item });
    } catch (error) { next(error); }
  },
};
