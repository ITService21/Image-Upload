import { Router } from 'express';
import { UploadController } from '../controllers/uploadController';
import { uploadMiddleware } from '../middleware/upload';
import { validateFileExtensions } from '../middleware/security';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post(
  '/',
  uploadLimiter,
  uploadMiddleware.array('files', 50),
  validateFileExtensions,
  UploadController.upload
);

router.post('/:id/retry', UploadController.retryProcessing);

export default router;
