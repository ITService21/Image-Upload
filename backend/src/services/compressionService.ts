import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { CompressionMethod } from '../types';
import { ensureDir } from '../utils/fileHelpers';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface CompressionResult {
  compressedPath: string;
  compressedSize: number;
  originalSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

export class CompressionService {
  static async compressImage(
    inputPath: string,
    outputFilename: string,
    method: CompressionMethod = 'sharp'
  ): Promise<CompressionResult> {
    const compressedDir = path.resolve(env.upload.dir, 'compressed');
    await ensureDir(compressedDir);
    const outputPath = path.join(compressedDir, outputFilename);

    const originalStats = await fs.stat(inputPath);
    const ext = path.extname(inputPath).toLowerCase();

    let result: CompressionResult;

    switch (method) {
      case 'sharp':
      default:
        result = await this.compressWithSharp(inputPath, outputPath, ext, originalStats.size);
        break;
    }

    logger.info(`Compressed ${outputFilename} using ${method}: ${originalStats.size} -> ${result.compressedSize} (${result.compressionRatio.toFixed(1)}%)`);
    return result;
  }

  private static async compressWithSharp(
    inputPath: string,
    outputPath: string,
    ext: string,
    originalSize: number
  ): Promise<CompressionResult> {
    let pipeline = sharp(inputPath, { animated: ext === '.gif' });

    pipeline = pipeline.rotate();

    const metadata = await sharp(inputPath).metadata();

    switch (ext) {
      case '.jpg':
      case '.jpeg':
        pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
        break;
      case '.png':
        pipeline = pipeline.png({ quality: 80, compressionLevel: 9 });
        break;
      case '.webp':
        pipeline = pipeline.webp({ quality: 80 });
        break;
      case '.gif':
        pipeline = pipeline.gif();
        break;
      case '.heic':
      case '.heif':
        pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
        const heicOutput = outputPath.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
        await pipeline.toFile(heicOutput);
        const heicStats = await fs.stat(heicOutput);
        return {
          compressedPath: heicOutput,
          compressedSize: heicStats.size,
          originalSize,
          compressionRatio: ((1 - heicStats.size / originalSize) * 100),
          width: metadata.width || 0,
          height: metadata.height || 0,
        };
      default:
        pipeline = pipeline.jpeg({ quality: 80 });
    }

    await pipeline.toFile(outputPath);
    const compressedStats = await fs.stat(outputPath);

    return {
      compressedPath: outputPath,
      compressedSize: compressedStats.size,
      originalSize,
      compressionRatio: ((1 - compressedStats.size / originalSize) * 100),
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  }

  static async generateThumbnail(inputPath: string, outputFilename: string): Promise<string> {
    const thumbDir = path.resolve(env.upload.dir, 'thumbnails');
    await ensureDir(thumbDir);
    const outputPath = path.join(thumbDir, `thumb_${outputFilename}`);

    const ext = path.extname(inputPath).toLowerCase();

    await sharp(inputPath, { animated: false })
      .resize(300, 300, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 70 })
      .toFile(outputPath.replace(ext, '.jpg'));

    return outputPath.replace(ext, '.jpg');
  }

  static async getImageDimensions(inputPath: string): Promise<{ width: number; height: number }> {
    const metadata = await sharp(inputPath).metadata();
    return { width: metadata.width || 0, height: metadata.height || 0 };
  }

  static async editImage(
    inputPath: string,
    outputPath: string,
    operations: {
      crop?: { left: number; top: number; width: number; height: number };
      rotate?: number;
      flip?: boolean;
      flop?: boolean;
      resize?: { width: number; height: number };
    }
  ): Promise<string> {
    let pipeline = sharp(inputPath);

    if (operations.crop) {
      pipeline = pipeline.extract(operations.crop);
    }
    if (operations.rotate !== undefined) {
      pipeline = pipeline.rotate(operations.rotate);
    }
    if (operations.flip) {
      pipeline = pipeline.flip();
    }
    if (operations.flop) {
      pipeline = pipeline.flop();
    }
    if (operations.resize) {
      pipeline = pipeline.resize(operations.resize.width, operations.resize.height, { fit: 'inside' });
    }

    await pipeline.toFile(outputPath);
    return outputPath;
  }
}
