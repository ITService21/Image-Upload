import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { VideoService } from '../services/videoService';
import { MediaService } from '../services/mediaService';
import { logger } from '../utils/logger';

interface VideoJobData {
  mediaId: number;
  inputPath: string;
  outputFilename: string;
}

const MAX_RETRIES = 3;

const videoWorker = new Worker<VideoJobData>(
  'video-processing',
  async (job: Job<VideoJobData>) => {
    const { mediaId, inputPath, outputFilename } = job.data;

    logger.info(`Processing video ${mediaId}: ${outputFilename}`);
    await MediaService.updateStatus(mediaId, 'processing');

    try {
      const result = await VideoService.compressVideo(inputPath, outputFilename);

      let thumbnailPath = '';
      try {
        thumbnailPath = await VideoService.generateVideoThumbnail(inputPath, outputFilename);
      } catch (e) {
        logger.warn(`Thumbnail generation failed for video ${mediaId}`);
      }

      await MediaService.update(mediaId, {
        compressed_path: result.compressedPath,
        compressed_size: result.compressedSize,
        compression_ratio: result.compressionRatio,
        width: result.width,
        height: result.height,
        duration: result.duration,
        is_compressed: true,
        thumbnail_path: thumbnailPath,
        status: 'completed',
      });

      logger.info(`Video ${mediaId} processed successfully`);
      return result;
    } catch (error: any) {
      const media = await MediaService.getById(mediaId);
      const retryCount = (media?.retry_count || 0) + 1;

      if (retryCount < MAX_RETRIES) {
        await MediaService.update(mediaId, {
          retry_count: retryCount,
          error_message: error.message,
          status: 'pending',
        });
        throw error;
      }

      await MediaService.updateStatus(mediaId, 'failed', {
        error_message: error.message,
        retry_count: retryCount,
      } as any);

      logger.error(`Video ${mediaId} processing failed after ${retryCount} retries:`, error);
    }
  },
  {
    connection: { host: env.redis.host, port: env.redis.port },
    concurrency: 2,
  }
);

videoWorker.on('completed', (job) => {
  logger.info(`Video job ${job.id} completed`);
});

videoWorker.on('failed', (job, err) => {
  logger.error(`Video job ${job?.id} failed:`, err);
});

export { videoWorker };
