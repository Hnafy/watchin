import { Response, NextFunction } from 'express';
import { supportService } from '../services/supportService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { User } from '../db/models.js';

export const supportController = {
  async contact(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
      const pageUrl = typeof req.body?.pageUrl === 'string' ? req.body.pageUrl.trim().slice(0, 500) : '';

      if (!message) {
        return res.status(400).json({ status: 'error', message: 'Message is required' });
      }
      if (message.length > 2000) {
        return res.status(400).json({ status: 'error', message: 'Message is too long (max 2000 characters)' });
      }

      let username: string | undefined;
      let email: string | undefined;
      if (req.user?.id) {
        const user = await User.findById(req.user.id).select('username email');
        username = user?.username;
        email = user?.email;
      }

      const delivered = await supportService.contactAdmin({
        message,
        subject,
        pageUrl,
        username,
        email,
      });

      if (!delivered) {
        return res.status(503).json({
          status: 'error',
          message: 'Support messaging is currently unavailable. Please try again later.',
        });
      }

      res.json({ status: 'success', message: 'Message sent to the admin' });
    } catch (error) {
      next(error);
    }
  },
};
