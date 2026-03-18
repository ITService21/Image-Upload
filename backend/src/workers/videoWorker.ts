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

const videoWorker = new Worker<VideoJobData>(
  'video-processing',
  async (job: Job<VideoJobData>) => {
    const { mediaId, inputPath, outputFilename } = job.data;

    logger.info('Video worker: job started', { jobId: job.id, mediaId, file: outputFilename });
    await MediaService.updateStatus(mediaId, 'processing');

    try {
      const result = await VideoService.compressVideo(inputPath, outputFilename);

      let thumbnailPath = '';
      try {
        thumbnailPath = await VideoService.generateVideoThumbnail(inputPath, outputFilename);
      } catch (e: any) {
        logger.warn('Video worker: thumbnail generation failed', { jobId: job.id, mediaId, error: e.message });
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

      logger.info('Video worker: job completed', {
        jobId: job.id,
        mediaId,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        ratio: `${result.compressionRatio.toFixed(1)}%`,
        duration: result.duration,
      });

      return result;
    } catch (error: any) {
      await MediaService.updateStatus(mediaId, 'failed', {
        error_message: error.message,
      } as any);
      logger.error('Video worker: job failed', {
        jobId: job.id,
        mediaId,
        error: error.message,
        stack: error.stack,
      });
    }
  },
  {
    connection: { host: env.redis.host, port: env.redis.port },
    concurrency: 2,
  }
);

videoWorker.on('completed', (job) => {
  logger.debug('Video worker: event completed', { jobId: job.id });
});

videoWorker.on('failed', (job, err) => {
  logger.error('Video worker: event failed', { jobId: job?.id, error: err.message });
});

export { videoWorker };
