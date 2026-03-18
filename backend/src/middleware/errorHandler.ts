import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId || 'unknown';

  if (err instanceof AppError) {
    logger.warn('Handled error', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: err.statusCode,
      error: err.message,
    });

    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  logger.error('Unhandled error', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode: 500,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
