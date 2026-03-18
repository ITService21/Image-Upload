import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = uuid().slice(0, 8);
  req.requestId = requestId;

  const start = Date.now();

  const logData: Record<string, any> = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
  };

  if (Object.keys(req.query).length > 0) {
    logData.query = req.query;
  }

  if (req.body && Object.keys(req.body).length > 0 && !req.is('multipart/form-data')) {
    logData.body = req.body;
  }

  logger.info('Incoming request', logData);

  const originalSend = res.send;
  res.send = function (body: any) {
    const durationMs = Date.now() - start;

    logger.info('Response sent', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    });

    return originalSend.call(this, body);
  };

  next();
}
