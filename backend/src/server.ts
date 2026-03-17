import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env';
import { initDatabase } from './config/database';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { stripSensitiveHeaders } from './middleware/security';
import { MediaController } from './controllers/mediaController';
import uploadRoutes from './routes/uploadRoutes';
import mediaRoutes from './routes/mediaRoutes';
import { ensureDir } from './utils/fileHelpers';

import './workers/imageWorker';
import './workers/videoWorker';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: env.nodeEnv === 'production'
    ? ['https://piwebtechnology.com']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(stripSensitiveHeaders);
app.use(apiLimiter);

app.use('/api/upload', uploadRoutes);
app.use('/api/media', mediaRoutes);

app.get('/media/:companySlug/:fileName', MediaController.serveFile);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

async function startServer() {
  try {
    await ensureDir(path.resolve(env.upload.dir, 'original'));
    await ensureDir(path.resolve(env.upload.dir, 'compressed'));
    await ensureDir(path.resolve(env.upload.dir, 'thumbnails'));
    await ensureDir(path.resolve('logs'));

    await initDatabase();

    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
      logger.info(`Environment: ${env.nodeEnv}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
