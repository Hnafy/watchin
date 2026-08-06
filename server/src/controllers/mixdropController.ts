import { Request, Response, NextFunction } from 'express';
import { mixdropService } from '../services/mixdropService.js';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

export const mixdropController = {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const filename = decodeURIComponent((req.headers['x-filename'] as string) || 'video.mp4').replace(/[\\/:*?"<>|]/g, '_');
      const body = req.body as Buffer;

      if (!body || !Buffer.isBuffer(body) || body.length === 0) {
        throw AppError.badRequest('No file received');
      }

      const result = await mixdropService.uploadFile(body, filename);

      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },
};
