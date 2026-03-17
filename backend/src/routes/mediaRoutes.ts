import { Router } from 'express';
import { MediaController } from '../controllers/mediaController';

const router = Router();

router.get('/', MediaController.getAll);
router.get('/stats', MediaController.getStats);
router.get('/companies', MediaController.getCompanies);
router.get('/:id', MediaController.getById);
router.get('/:id/original', MediaController.serveOriginal);
router.get('/:id/compressed', MediaController.serveCompressed);
router.get('/:id/thumbnail', MediaController.serveThumbnail);
router.put('/:id/edit', MediaController.editImage);
router.put('/:id/recompress', MediaController.recompress);
router.put('/:id/use-original', MediaController.useOriginal);
router.put('/:id/filename', MediaController.updateFileName);
router.delete('/:id', MediaController.delete);
router.post('/bulk-delete', MediaController.bulkDelete);

export default router;
