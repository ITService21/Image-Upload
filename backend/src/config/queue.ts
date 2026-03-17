import { Queue } from 'bullmq';
import { env } from './env';

const connection = {
  host: env.redis.host,
  port: env.redis.port,
};

export const imageQueue = new Queue('image-processing', { connection });
export const videoQueue = new Queue('video-processing', { connection });
