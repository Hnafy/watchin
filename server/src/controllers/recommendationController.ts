import { Response, NextFunction } from 'express';
import { geminiService } from '../services/geminiService';
import { mediaService } from '../services/mediaService';
import { recommendationService } from '../services/recommendationService';
import { AuthRequest } from '../middleware/authMiddleware';

export const recommendationController = {
  async getAiRecommendations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        const fallback = await mediaService.getPopular(20);
        return res.json({ status: 'success', data: fallback, source: 'popular' });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const ai = await geminiService.getRecommendations(req.user.id, limit);

      if (!ai) {
        const fallback = await mediaService.getRecommended(req.user.id, limit);
        return res.json({ status: 'success', data: fallback, source: 'db' });
      }

      res.json({ status: 'success', data: ai, source: 'ai' });
    } catch (error) {
      next(error);
    }
  },

  async getSimilarMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { mediaId } = req.params;
      if (!mediaId) {
        return res.status(400).json({ status: 'error', message: 'mediaId is required' });
      }
      const similar = await recommendationService.getSimilarMedia(mediaId);
      res.json({ status: 'success', data: similar });
    } catch (error) {
      next(error);
    }
  },
};
