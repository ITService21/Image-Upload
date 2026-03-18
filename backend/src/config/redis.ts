import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('connect', () => logger.info('Redis connected', { host: env.redis.host, port: env.redis.port }));
redis.on('error', (err) => logger.error('Redis connection error', { error: err.message }));
redis.on('close', () => logger.warn('Redis connection closed'));
redis.on('reconnecting', () => logger.info('Redis reconnecting'));

export const cacheGet = async (key: string): Promise<string | null> => {
  try {
    return await redis.get(key);
  } catch (err: any) {
    logger.error('Redis GET failed', { key, error: err.message });
    return null;
  }
};

export const cacheSet = async (key: string, value: string, ttl = 3600): Promise<void> => {
  try {
    await redis.setex(key, ttl, value);
  } catch (err: any) {
    logger.error('Redis SET failed', { key, ttl, error: err.message });
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  try {
    await redis.del(key);
  } catch (err: any) {
    logger.error('Redis DEL failed', { key, error: err.message });
  }
};
