import { Response, NextFunction } from 'express';
import { commentService } from '../services/commentService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const commentController = {
  async getByMedia(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await commentService.getByMedia(req.params.mediaId, page, limit);
      res.json({ status: 'success', ...result });
    } catch (error) { next(error); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const comment = await commentService.create(req.params.mediaId, req.user!.id, req.body.content);
      res.status(201).json({ status: 'success', data: comment });
    } catch (error) { next(error); }
  },

  async reply(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const comment = await commentService.reply(req.params.id, req.user!.id, req.body.content);
      res.status(201).json({ status: 'success', data: comment });
    } catch (error) { next(error); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await commentService.remove(req.params.id, req.user!.id, req.user!.role);
      res.json({ status: 'success', message: 'Comment deleted' });
    } catch (error) { next(error); }
  },
};
