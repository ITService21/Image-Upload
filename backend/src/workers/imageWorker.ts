import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { CompressionService } from '../services/compressionService';
import { MediaService } from '../services/mediaService';
import { logger } from '../utils/logger';
import { CompressionMethod } from '../types';

interface ImageJobData {
  mediaId: number;
  inputPath: string;
  outputFilename: string;
  compressionMethod: CompressionMethod;
}

const imageWorker = new Worker<ImageJobData>(
  'image-processing',
  async (job: Job<ImageJobData>) => {
    const { mediaId, inputPath, outputFilename, compressionMethod } = job.data;

    logger.info(`Processing image ${mediaId}: ${outputFilename}`);
    await MediaService.updateStatus(mediaId, 'processing');

    try {
      const result = await CompressionService.compressImage(inputPath, outputFilename, compressionMethod);
      const thumbnail = await CompressionService.generateThumbnail(inputPath, outputFilename);

      await MediaService.update(mediaId, {
        compressed_path: result.compressedPath,
        compressed_size: result.compressedSize,
        compression_ratio: result.compressionRatio,
        width: result.width,
        height: result.height,
        is_compressed: true,
        thumbnail_path: thumbnail,
        status: 'completed',
      });

      logger.info(`Image ${mediaId} processed successfully`);
      return result;
    } catch (error: any) {
      await MediaService.updateStatus(mediaId, 'failed', {
        error_message: error.message,
      } as any);
      logger.error(`Image ${mediaId} processing failed:`, error);
    }
  },
  {
    connection: { host: env.redis.host, port: env.redis.port },
    concurrency: 3,
  }
);

imageWorker.on('completed', (job) => {
  logger.info(`Image job ${job.id} completed`);
});

imageWorker.on('failed', (job, err) => {
  logger.error(`Image job ${job?.id} failed:`, err);
});

export { imageWorker };
