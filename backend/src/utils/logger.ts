import winston from 'winston';
import path from 'path';

const logDir = path.resolve(__dirname, '../../logs');

const sanitize = winston.format((info) => {
  const body = info.body as Record<string, unknown> | undefined;
  if (body?.password) body.password = '***';
  if (body?.token) body.token = '***';
  return info;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    sanitize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'media-storage-service' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log') }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, requestId, method, url, statusCode, durationMs, ...rest }) => {
          const rid = requestId ? `[${requestId}]` : '';
          const req = method ? ` ${method} ${url}` : '';
          const status = statusCode ? ` → ${statusCode}` : '';
          const dur = durationMs !== undefined ? ` (${durationMs}ms)` : '';
          const extra = Object.keys(rest).length > 1 ? ` ${JSON.stringify(rest)}` : '';
          return `${timestamp} ${level}: ${rid}${req} ${message}${status}${dur}${extra}`;
        })
      ),
    })
  );
}

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection', { error: reason?.message || reason, stack: reason?.stack });
});
