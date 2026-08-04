export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: any) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = 'Unauthorized', details?: any) {
    return new AppError(message, 401, details);
  }

  static forbidden(message = 'Forbidden', details?: any) {
    return new AppError(message, 403, details);
  }

  static notFound(message = 'Resource not found', details?: any) {
    return new AppError(message, 404, details);
  }

  static conflict(message: string, details?: any) {
    return new AppError(message, 409, details);
  }

  static validation(message: string, details?: any) {
    return new AppError(message, 422, details);
  }

  static tooManyRequests(message = 'Too many requests', details?: any) {
    return new AppError(message, 429, details);
  }

  static internal(message = 'Internal server error', details?: any) {
    return new AppError(message, 500, details);
  }
}