import { Response, NextFunction } from 'express';
import { tmdbService } from '../services/tmdbService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const tmdbController = {
  async search(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { q, type } = req.query;
      if (!q || (q as string).length < 2) {
        return res.json({ status: 'success', data: [] });
      }
      const results = await tmdbService.search(q as string, type as string);
      res.json({ status: 'success', data: results });
    } catch (error) { next(error); }
  },

  async getDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tmdbId = parseInt(req.params.tmdbId);
      const type = req.query.type as string || 'MOVIE';
      const data = await tmdbService.getDetails(tmdbId, type);
      res.json({ status: 'success', data });
    } catch (error) { next(error); }
  },

  async import(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { tmdbId, type } = req.body;
      if (!tmdbId || !type) {
        return res.status(400).json({ status: 'error', message: 'tmdbId and type are required' });
      }
      const media = await tmdbService.import(tmdbId, type);
      res.status(201).json({ status: 'success', data: media });
    } catch (error) { next(error); }
  },
};
