import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { AppError } from '../utils/AppError.js';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await authService.register(req.body);
      setAuthCookies(res, accessToken, refreshToken);
      res.status(201).json({
        status: 'success',
        message: 'Registration successful',
        user: { id: user.id, email: user.email, username: user.username, role: user.role },
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await authService.login(req.body);
      setAuthCookies(res, accessToken, refreshToken);
      res.json({
        status: 'success',
        user: { id: user.id, email: user.email, username: user.username, role: user.role, avatar: user.avatar },
      });
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) throw AppError.unauthorized('Refresh token required');

      const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);
      setAuthCookies(res, accessToken, newRefreshToken);
      res.json({ status: 'success' });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) await authService.logout(refreshToken);
      clearAuthCookies(res);
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

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', accessToken, { httpOnly: true, secure: isProduction, sameSite: 'lax', maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: isProduction, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};
