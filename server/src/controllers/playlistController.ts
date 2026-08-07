import { Response, NextFunction } from 'express';
import { playlistService } from '../services/playlistService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const playlistController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const sortBy = (req.query.sortBy as string) || 'trending';
      const result = await playlistService.getPublicPlaylists(page, limit, search, sortBy);
      res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  },

  async trending(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const playlists = await playlistService.getTrendingPlaylists(limit);
      res.json({ status: 'success', data: playlists });
    } catch (error) {
      next(error);
    }
  },

  async getUserPlaylists(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const playlists = await playlistService.getUserPlaylists(req.user!.id);
      res.json({ status: 'success', data: playlists });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { playlistId } = req.params;
      const userId = req.user?.id;
      const playlist = await playlistService.getPlaylist(playlistId, userId);
      res.json({ status: 'success', data: playlist });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { title, description, visibility } = req.body;
      const playlist = await playlistService.create(req.user!.id, title, description, visibility);
      res.status(201).json({ status: 'success', data: playlist });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { playlistId } = req.params;
      const playlist = await playlistService.updatePlaylist(playlistId, req.user!.id, req.body);
      res.json({ status: 'success', data: playlist });
    } catch (error) {
      next(error);
    }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { playlistId } = req.params;
      await playlistService.deletePlaylist(playlistId, req.user!.id);
      res.json({ status: 'success', message: 'Playlist deleted' });
    } catch (error) {
      next(error);
    }
  },

  async addItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { playlistId } = req.params;
      const { mediaId, progress, rating, notes } = req.body;
      const playlist = await playlistService.addItem(playlistId, req.user!.id, mediaId, progress, rating, notes);
      res.json({ status: 'success', data: playlist });
    } catch (error) {
      next(error);
    }
  },

  async removeItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { playlistId, mediaId } = req.params;
      const playlist = await playlistService.removeItem(playlistId, req.user!.id, mediaId);
      res.json({ status: 'success', data: playlist });
    } catch (error) {
      next(error);
    }
  },

  async toggleLike(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { playlistId } = req.params;
      const result = await playlistService.toggleLike(playlistId, req.user!.id);
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async toggleSave(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { playlistId } = req.params;
      const result = await playlistService.toggleSave(playlistId, req.user!.id);
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },

  async fork(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { playlistId } = req.params;
      const playlist = await playlistService.forkPlaylist(playlistId, req.user!.id);
      res.status(201).json({ status: 'success', data: playlist });
    } catch (error) {
      next(error);
    }
  },
};