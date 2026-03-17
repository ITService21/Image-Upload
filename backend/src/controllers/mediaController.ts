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

export class MediaController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { companyId, status, search, page, limit } = req.query;
      const result = await MediaService.getAll({
        companyId: companyId ? Number(companyId) : undefined,
        status: status as string,
        search: search as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media) throw new NotFoundError('Media not found');
      res.json({ success: true, data: media });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media) throw new NotFoundError('Media not found');
      await MediaService.delete(Number(req.params.id));
      res.json({ success: true, message: 'Media deleted permanently' });
    } catch (error) {
      next(error);
    }
  }

  static async bulkDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new ValidationError('IDs array is required');
      }
      await MediaService.bulkDelete(ids);
      res.json({ success: true, message: `${ids.length} media items deleted` });
    } catch (error) {
      next(error);
    }
  }

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { companyId } = req.query;
      const stats = await MediaService.getStats(companyId ? Number(companyId) : undefined);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  static async serveFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { companySlug, fileName } = req.params;
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
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media) throw new NotFoundError('Media not found');

      const absolutePath = path.resolve(media.storage_path);
      try {
        await fs.access(absolutePath);
      } catch {
        throw new NotFoundError('File not found on disk');
      }

      res.setHeader('Content-Type', media.mime_type);
      res.sendFile(absolutePath);
    } catch (error) {
      next(error);
    }
  }

  static async serveCompressed(req: Request, res: Response, next: NextFunction) {
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media || !media.compressed_path) throw new NotFoundError('Compressed file not found');

      const absolutePath = path.resolve(media.compressed_path);
      try {
        await fs.access(absolutePath);
      } catch {
        throw new NotFoundError('File not found on disk');
      }

      res.setHeader('Content-Type', media.mime_type.includes('heic') ? 'image/jpeg' : media.mime_type);
      res.sendFile(absolutePath);
    } catch (error) {
      next(error);
    }
  }

  static async serveThumbnail(req: Request, res: Response, next: NextFunction) {
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media || !media.thumbnail_path) throw new NotFoundError('Thumbnail not found');

      const absolutePath = path.resolve(media.thumbnail_path);
      try {
        await fs.access(absolutePath);
      } catch {
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
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media) throw new NotFoundError('Media not found');
      if (media.file_type !== 'image') throw new ValidationError('Only images can be edited');

      const { crop, rotate, flip, flop, resize } = req.body;

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

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async recompress(req: Request, res: Response, next: NextFunction) {
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media) throw new NotFoundError('Media not found');

      const { compressionMethod } = req.body;
      const method: CompressionMethod = compressionMethod || 'sharp';

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
        // For video, use same queue
        const { videoQueue } = require('../config/queue');
        await videoQueue.add('compress', {
          mediaId: media.id,
          inputPath: media.storage_path,
          outputFilename: media.file_name,
        });
      }

      res.json({ success: true, message: `Recompression queued with ${method}` });
    } catch (error) {
      next(error);
    }
  }

  static async useOriginal(req: Request, res: Response, next: NextFunction) {
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media) throw new NotFoundError('Media not found');

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
    try {
      const media = await MediaService.getById(Number(req.params.id));
      if (!media) throw new NotFoundError('Media not found');

      const { fileName } = req.body;
      if (!fileName) throw new ValidationError('File name is required');

      const updated = await MediaService.update(media.id, {
        original_name: fileName,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}
