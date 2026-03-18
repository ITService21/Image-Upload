import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { ensureDir } from '../utils/fileHelpers';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface VideoCompressionResult {
  compressedPath: string;
  compressedSize: number;
  originalSize: number;
  compressionRatio: number;
  width: number;
  height: number;
  duration: number;
}

export class VideoService {
  static async compressVideo(inputPath: string, outputFilename: string): Promise<VideoCompressionResult> {
    const compressedDir = path.resolve(env.upload.dir, 'compressed');
    await ensureDir(compressedDir);
    const outputPath = path.join(compressedDir, outputFilename.replace(/\.[^.]+$/, '.mp4'));

    const originalStats = await fs.stat(inputPath);
    const metadata = await this.getVideoMetadata(inputPath);

    logger.info('Video compression started', {
      file: outputFilename,
      originalSize: originalStats.size,
      duration: metadata.duration,
      resolution: `${metadata.width}x${metadata.height}`,
    });

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-crf 23',
          '-preset medium',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart',
        ])
        .output(outputPath)
        .on('end', async () => {
          try {
            const compressedStats = await fs.stat(outputPath);
            logger.info('Video compression completed', {
              file: outputFilename,
              originalSize: originalStats.size,
              compressedSize: compressedStats.size,
              ratio: `${((1 - compressedStats.size / originalStats.size) * 100).toFixed(1)}%`,
            });
            resolve({
              compressedPath: outputPath,
              compressedSize: compressedStats.size,
              originalSize: originalStats.size,
              compressionRatio: ((1 - compressedStats.size / originalStats.size) * 100),
              width: metadata.width,
              height: metadata.height,
              duration: metadata.duration,
            });
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (err) => {
          logger.error('Video compression failed', { file: outputFilename, error: err.message });
          reject(err);
        })
        .run();
    });
  }

  static async generateVideoThumbnail(inputPath: string, outputFilename: string): Promise<string> {
    const thumbDir = path.resolve(env.upload.dir, 'thumbnails');
    await ensureDir(thumbDir);
    const outputPath = path.join(thumbDir, `thumb_${outputFilename.replace(/\.[^.]+$/, '.jpg')}`);

    logger.debug('Generating video thumbnail', { file: outputFilename });

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          count: 1,
          folder: thumbDir,
          filename: `thumb_${outputFilename.replace(/\.[^.]+$/, '.jpg')}`,
          size: '300x300',
        })
        .on('end', () => resolve(outputPath))
        .on('error', (err) => {
          logger.warn('Video thumbnail generation failed', { file: outputFilename, error: err.message });
          reject(err);
        });
    });
  }

  static async getVideoMetadata(inputPath: string): Promise<{ width: number; height: number; duration: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) return reject(err);
        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        resolve({
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          duration: metadata.format.duration || 0,
        });
      });
    });
  }
}
