import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { CompanyService } from '../services/companyService';
import { MediaService } from '../services/mediaService';
import { CompressionService } from '../services/compressionService';
import { imageQueue, videoQueue } from '../config/queue';
import { isImageType, isVideoType, slugifyCompany, slugifyFilename } from '../utils/fileHelpers';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { CompressionMethod } from '../types';
import { env } from '../config/env';

export class UploadController {
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new ValidationError('No files uploaded');
      }

      const companyName = req.body.companyName;
      if (!companyName) {
        throw new ValidationError('Company name is required');
      }

      const compressionEnabled = req.body.compressionEnabled !== 'false';
      const defaultMethod: CompressionMethod = req.body.compressionMethod || 'sharp';

      let fileCompressionMethods: Record<string, CompressionMethod> = {};
      if (req.body.fileCompressionMethods) {
        try {
          fileCompressionMethods = JSON.parse(req.body.fileCompressionMethods);
        } catch {
          fileCompressionMethods = {};
        }
      }

      const company = await CompanyService.findOrCreate(companyName);
      const companySlug = slugifyCompany(companyName);
      const results = [];

      const extToMime: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.webp': 'image/webp', '.gif': 'image/gif',
        '.heic': 'image/heic', '.heif': 'image/heif',
        '.mp4': 'video/mp4', '.mov': 'video/quicktime',
      };

      for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase();
        const mimeType = file.mimetype === 'application/octet-stream'
          ? (extToMime[ext] || file.mimetype)
          : file.mimetype;

        const fileName = file.filename;
        const publicUrl = MediaService.generatePublicUrl(companySlug, fileName);

        const dimensions = isImageType(mimeType)
          ? await CompressionService.getImageDimensions(file.path).catch(() => ({ width: 0, height: 0 }))
          : { width: 0, height: 0 };

        const fileMethod = fileCompressionMethods[file.originalname] || defaultMethod;

        const media = await MediaService.create({
          company_id: company.id,
          file_name: fileName,
          original_name: file.originalname,
          file_type: isImageType(mimeType) ? 'image' : 'video',
          mime_type: mimeType,
          file_size: file.size,
          storage_path: file.path,
          public_url: publicUrl,
          compression_method: fileMethod,
          width: dimensions.width,
          height: dimensions.height,
          status: compressionEnabled ? 'pending' : 'completed',
          is_compressed: false,
        });

        if (compressionEnabled) {
          if (isImageType(mimeType)) {
            await imageQueue.add('compress', {
              mediaId: media.id,
              inputPath: file.path,
              outputFilename: fileName,
              compressionMethod: fileMethod,
            });
          } else if (isVideoType(mimeType)) {
            await videoQueue.add('compress', {
              mediaId: media.id,
              inputPath: file.path,
              outputFilename: fileName,
            });
          }
        } else {
          const thumbnailPath = isImageType(mimeType)
            ? await CompressionService.generateThumbnail(file.path, fileName).catch(() => '')
            : '';

          await MediaService.update(media.id, {
            thumbnail_path: thumbnailPath,
            status: 'completed',
          });
        }

        results.push(media);
      }

      res.status(201).json({
        success: true,
        data: results,
        message: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      next(error);
    }
  }

  static async retryProcessing(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const media = await MediaService.getById(Number(id));
      if (!media) throw new ValidationError('Media not found');

      await MediaService.update(Number(id), {
        status: 'pending',
        retry_count: 0,
        error_message: null,
      });

      if (media.file_type === 'image') {
        await imageQueue.add('compress', {
          mediaId: media.id,
          inputPath: media.storage_path,
          outputFilename: media.file_name,
          compressionMethod: media.compression_method as CompressionMethod,
        });
      } else {
        await videoQueue.add('compress', {
          mediaId: media.id,
          inputPath: media.storage_path,
          outputFilename: media.file_name,
        });
      }

      res.json({ success: true, message: 'Retry queued' });
    } catch (error) {
      next(error);
    }
  }
}
