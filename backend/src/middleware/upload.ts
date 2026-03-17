import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { env } from '../config/env';
import { ALLOWED_TYPES, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, sanitizeFilename } from '../utils/fileHelpers';

const ALLOWED_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(env.upload.dir, 'original'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = sanitizeFilename(path.basename(file.originalname, ext));
    cb(null, `${safeName}-${uuid().slice(0, 8)}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
    return;
  }

  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype} (${ext})`));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.upload.maxFileSize,
    files: 50,
  },
});
