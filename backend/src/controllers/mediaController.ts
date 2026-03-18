import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { MediaService } from '../services/mediaService';
import { CompanyService } from '../services/companyService';
import { CompressionService } from '../services/compressionService';
import { NotFoundError, ValidationError } from '../utils/errors';
import { imageQueue } from '../config/queue';
import { CompressionMethod } from '../types';
import { env } from '../config/env';
import { ensureDir } from '../utils/fileHelpers';
import { logger } from '../utils/logger';

export class MediaController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    const rid = req.requestId;
    try {
      const { companyId, status, search, page, limit } = req.query;

      logger.debug('Fetching media list', { requestId: rid, companyId, status, search, page, limit });

      const result = await MediaService.getAll({
        companyId: companyId ? Number(companyId) : undefined,
        status: status as string,
        search: search as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      });

      logger.debug('Media list fetched', { requestId: rid, total: result.total, page: result.page });

      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Failed to fetch media list', { requestId: rid, error: (error as Error).message });
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    const rid = req.requestId;
    try {
      const mediaId = Number(req.params.id);
      logger.debug('Fetching media by ID', { requestId: rid, mediaId });

      const media = await MediaService.getById(mediaId);
      if (!media) throw new NotFoundError('Media not found');

      res.json({ success: true, data: media });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    const rid = req.requestId;
    try {
      const mediaId = Number(req.params.id);
      const media = await MediaService.getById(mediaId);
      if (!media) throw new NotFoundError('Media not found');

      logger.info('Deleting media', { requestId: rid, mediaId, fileName: media.original_name });

      await MediaService.delete(mediaId);

      logger.info('Media deleted', { requestId: rid, mediaId });
      res.json({ success: true, message: 'Media deleted permanently' });
    } catch (error) {
      logger.error('Delete failed', { requestId: rid, error: (error as Error).message });
      next(error);
    }
  }

  static async bulkDelete(req: Request, res: Response, next: NextFunction) {
    const rid = req.requestId;
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new ValidationError('IDs array is required');
      }

      logger.info('Bulk delete requested', { requestId: rid, count: ids.length, ids });

      await MediaService.bulkDelete(ids);

      logger.info('Bulk delete completed', { requestId: rid, count: ids.length });
      res.json({ success: true, message: `${ids.length} media items deleted` });
    } catch (error) {
      logger.error('Bulk delete failed', { requestId: rid, error: (error as Error).message });
      next(error);
    }
  }

  static async getStats(req: Request, res: Response, next: NextFunction) {
    const rid = req.requestId;
    try {
      const { companyId } = req.query;
      logger.debug('Fetching stats', { requestId: rid, companyId });

      const stats = await MediaService.getStats(companyId ? Number(companyId) : undefined);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  static async serveFile(req: Request, res: Response, next: NextFunction) {
    const rid = req.requestId;
    try {
      const { companySlug, fileName } = req.params;
      logger.debug('Serving public file', { requestId: rid, companySlug, fileName });

      const media = await MediaService.getPublicUrl(companySlug, fileName);
      if (!media) throw new NotFoundError('File not found');

      const filePath = media.compressed_path || media.storage_path;
      const absolutePath = path.resolve(filePath);

      try {
        await fs.access(absolutePath);
      } catch {
        throw new NotFoundError('File not found on disk');
      }

      res.setHeader('Content-Type', media.mime_type);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.sendFile(absolutePath);
    } catch (error) {
      next(error);
    }
  }

  static async serveOriginal(req: Request, res: Response, next: NextFunction) {
    const rid = req.requestId;
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media) throw new NotFoundError('Media not found');

      const absolutePath = path.resolve(media.storage_path);
      try {
        await fs.access(absolutePath);
      } catch {
        logger.warn('Original file missing from disk', { requestId: rid, mediaId: media.id, path: media.storage_path });
        throw new NotFoundError('File not found on disk');
      }

      res.setHeader('Content-Type', media.mime_type);
      res.sendFile(absolutePath);
    } catch (error) {
      next(error);
    }
  }

  static async serveCompressed(req: Request, res: Response, next: NextFunction) {
    const rid = req.requestId;
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media || !media.compressed_path) throw new NotFoundError('Compressed file not found');

      const absolutePath = path.resolve(media.compressed_path);
      try {
        await fs.access(absolutePath);
      } catch {
        logger.warn('Compressed file missing from disk', { requestId: rid, mediaId: media.id, path: media.compressed_path });
        throw new NotFoundError('File not found on disk');
      }

      res.setHeader('Content-Type', media.mime_type.includes('heic') ? 'image/jpeg' : media.mime_type);
      res.sendFile(absolutePath);
    } catch (error) {
      next(error);
    }
  }

  static async serveThumbnail(req: Request, res: Response, next: NextFunction) {
    const rid = req.requestId;
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media || !media.thumbnail_path) throw new NotFoundError('Thumbnail not found');

      const absolutePath = path.resolve(media.thumbnail_path);
      try {
        await fs.access(absolutePath);
      } catch {
        logger.warn('Thumbnail missing from disk', { requestId: rid, mediaId: media.id, path: media.thumbnail_path });
        throw new NotFoundError('Thumbnail not found on disk');
      }

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.sendFile(absolutePath);
    } catch (error) {
      next(error);
    }
  }

  static async editImage(req: Request, res: Response, next: NextFunction) {
    const rid = req.requestId;
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media) throw new NotFoundError('Media not found');
      if (media.file_type !== 'image') throw new ValidationError('Only images can be edited');

      const { crop, rotate, flip, flop, resize } = req.body;

      logger.info('Editing image', {
        requestId: rid,
        mediaId: media.id,
        operations: { crop: !!crop, rotate: rotate !== undefined, flip, flop, resize: !!resize },
      });

      const inputPath = media.compressed_path || media.storage_path;
      const outputDir = path.resolve(env.upload.dir, 'original');
      await ensureDir(outputDir);
      const outputPath = path.join(outputDir, media.file_name);

      const tempPath = outputPath + '.tmp';

      await CompressionService.editImage(path.resolve(inputPath), tempPath, {
        crop,
        rotate,
        flip,
        flop,
        resize,
      });

      await fs.rename(tempPath, path.resolve(media.storage_path));

      const dimensions = await CompressionService.getImageDimensions(path.resolve(media.storage_path));
      const stat = await fs.stat(path.resolve(media.storage_path));

      if (media.is_compressed) {
        await imageQueue.add('compress', {
          mediaId: media.id,
          inputPath: path.resolve(media.storage_path),
          outputFilename: media.file_name,
          compressionMethod: media.compression_method as CompressionMethod,
        });
      }

      const updated = await MediaService.update(media.id, {
        width: dimensions.width,
        height: dimensions.height,
        file_size: stat.size,
        status: media.is_compressed ? 'processing' : 'completed',
      });

      logger.info('Image edit completed', { requestId: rid, mediaId: media.id, newSize: stat.size });

      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('Image edit failed', { requestId: rid, error: (error as Error).message, stack: (error as Error).stack });
      next(error);
    }
  }

  static async recompress(req: Request, res: Response, next: NextFunction) {
    const rid = req.requestId;
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media) throw new NotFoundError('Media not found');

      const { compressionMethod } = req.body;
      const method: CompressionMethod = compressionMethod || 'sharp';

      logger.info('Recompression requested', { requestId: rid, mediaId: media.id, method });

      await MediaService.update(media.id, {
        compression_method: method,
        status: 'pending',
        is_compressed: false,
      });

      if (media.file_type === 'image') {
        await imageQueue.add('compress', {
          mediaId: media.id,
          inputPath: media.storage_path,
          outputFilename: media.file_name,
          compressionMethod: method,
        });
      } else {
        const { videoQueue } = require('../config/queue');
        await videoQueue.add('compress', {
          mediaId: media.id,
          inputPath: media.storage_path,
          outputFilename: media.file_name,
        });
      }

      logger.info('Recompression queued', { requestId: rid, mediaId: media.id, method });
      res.json({ success: true, message: `Recompression queued with ${method}` });
    } catch (error) {
      logger.error('Recompression failed', { requestId: rid, error: (error as Error).message });
      next(error);
    }
  }

  static async useOriginal(req: Request, res: Response, next: NextFunction) {
    const rid = req.requestId;
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media) throw new NotFoundError('Media not found');

      logger.info('Switching to original file', { requestId: rid, mediaId: media.id });

      await MediaService.update(media.id, {
        is_compressed: false,
        compressed_path: null,
        compressed_size: null,
        compression_ratio: null,
      });

      res.json({ success: true, message: 'Using original file' });
    } catch (error) {
      next(error);
    }
  }

  static async getCompanies(_req: Request, res: Response, next: NextFunction) {
    try {
      const companies = await CompanyService.getAll();
      res.json({ success: true, data: companies });
    } catch (error) {
      next(error);
    }
  }

  static async updateFileName(req: Request, res: Response, next: NextFunction) {
    const rid = req.requestId;
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media) throw new NotFoundError('Media not found');

      const { fileName } = req.body;
      if (!fileName) throw new ValidationError('File name is required');

      logger.info('Updating file name', { requestId: rid, mediaId: media.id, oldName: media.original_name, newName: fileName });

      const updated = await MediaService.update(media.id, {
        original_name: fileName,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}
