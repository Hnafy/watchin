import { Response, NextFunction } from 'express';
import { ratingService } from '../services/ratingService';
import { AuthRequest } from '../middleware/authMiddleware';

export const ratingController = {
  async rateMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { mediaId, value } = req.body;
      const rating = await ratingService.rateMedia(req.user!.id, mediaId, value);
      res.json({ status: 'success', data: rating });
    } catch (error) {
      next(error);
    }
  },

  async getUserRating(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rating = await ratingService.getUserRating(req.user!.id, req.params.mediaId);
      res.json({ status: 'success', data: { rating } });
    } catch (error) {
      next(error);
    }
  },

  async getMediaRatings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await ratingService.getMediaRatings(req.params.mediaId, parseInt(page as string), parseInt(limit as string));
      res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  },

  async getMediaRatingStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await ratingService.getMediaRatingStats(req.params.mediaId);
      res.json({ status: 'success', data: stats });
    } catch (error) {
      next(error);
    }
  },

  async deleteRating(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await ratingService.deleteRating(req.user!.id, req.params.mediaId);
      res.json({ status: 'success', message: 'Rating deleted' });
    } catch (error) {
      next(error);
    }
  },
};