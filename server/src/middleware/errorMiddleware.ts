import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      status: 'error',
      message: 'Validation failed',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err.name === 'PayloadTooLargeError') {
    return res.status(413).json({
      status: 'error',
      message: 'File is too large to upload',
    });
  }

  // Mongoose errors
  const mongoErr = err as { code?: number | string; name?: string; path?: string; keyPattern?: Record<string, unknown> };
  if (mongoErr.name === 'CastError') {
    return res.status(404).json({
      status: 'error',
      message: 'Record not found',
    });
  }

  if (mongoErr.code === 11000) {
    const target = mongoErr.keyPattern ? Object.keys(mongoErr.keyPattern).join(', ') : 'field';
    return res.status(409).json({
      status: 'error',
      message: `${target} already exists`,
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(422).json({
      status: 'error',
      message: 'Validation failed',
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired',
    });
  }

  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
};