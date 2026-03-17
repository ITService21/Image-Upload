import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../utils/fileHelpers';

const ALLOWED_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];

export function validateFileExtensions(req: Request, res: Response, next: NextFunction): void {
  if (!req.files || !Array.isArray(req.files)) {
    next();
    return;
  }

  for (const file of req.files) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      res.status(415).json({
        success: false,
        error: `File type ${ext} is not supported`,
      });
      return;
    }
  }
  next();
}

export function stripSensitiveHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.removeHeader('X-Powered-By');
  next();
}
