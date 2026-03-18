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

    logger.info('Image worker: job started', { jobId: job.id, mediaId, file: outputFilename, method: compressionMethod });
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

      logger.info('Image worker: job completed', {
        jobId: job.id,
        mediaId,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        ratio: `${result.compressionRatio.toFixed(1)}%`,
      });

      return result;
    } catch (error: any) {
      await MediaService.updateStatus(mediaId, 'failed', {
        error_message: error.message,
      } as any);
      logger.error('Image worker: job failed', {
        jobId: job.id,
        mediaId,
        error: error.message,
        stack: error.stack,
      });
    }
  },
  {
    connection: { host: env.redis.host, port: env.redis.port },
    concurrency: 3,
  }
);

imageWorker.on('completed', (job) => {
  logger.debug('Image worker: event completed', { jobId: job.id });
});

imageWorker.on('failed', (job, err) => {
  logger.error('Image worker: event failed', { jobId: job?.id, error: err.message });
});

export { imageWorker };
