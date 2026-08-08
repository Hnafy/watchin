import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { AppError } from '../utils/AppError.js';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await authService.register(req.body);
      res.status(201).json({
        status: 'success',
        message: 'Registration successful',
        user: { id: user.id, email: user.email, username: user.username, role: user.role },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  },

  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await authService.googleLogin(req.body.idToken);
      res.json({
        status: 'success',
        user: { id: user.id, email: user.email, username: user.username, role: user.role, avatar: user.avatar },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await authService.login(req.body);
      res.json({
        status: 'success',
        user: { id: user.id, email: user.email, username: user.username, role: user.role, avatar: user.avatar },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body?.refreshToken;
      if (!refreshToken) throw AppError.unauthorized('Refresh token required');

      const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);
      res.json({ status: 'success', accessToken, refreshToken: newRefreshToken });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body?.refreshToken;
      if (refreshToken) await authService.logout(refreshToken);
      res.json({ status: 'success', message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe((req as any).user.id);
      if (!user) throw AppError.notFound('User not found');
      res.json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  },
};
