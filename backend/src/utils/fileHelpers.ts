import path from 'path';
import fs from 'fs/promises';
import slugify from 'slugify';
import { v4 as uuid } from 'uuid';

export const ALLOWED_IMAGE_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
  'image/heic', 'image/heif', 'image/gif',
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4', 'video/quicktime', 'video/mov',
];

export const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif', '.gif'];
export const VIDEO_EXTENSIONS = ['.mp4', '.mov'];

export function isImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

export function isVideoType(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType) || mimeType === 'video/mov';
}

export function slugifyFilename(filename: string): string {
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  const slugged = slugify(name, { lower: true, strict: true, trim: true });
  return `${slugged}-${uuid().slice(0, 8)}${ext.toLowerCase()}`;
}

export function slugifyCompany(name: string): string {
  return slugify(name, { lower: true, strict: true, trim: true });
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);
}
