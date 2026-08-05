import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt.js';
import { User } from '../db/models.js';
import { AppError } from '../utils/AppError.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      throw AppError.unauthorized('Authentication required');
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('id email role emailVerified');

    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(AppError.forbidden('Insufficient permissions'));
    }
    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('id email role');
      if (user) {
        req.user = { id: user.id, email: user.email, role: user.role };
      }
    }
    next();
  } catch {
    next();
  }
};
