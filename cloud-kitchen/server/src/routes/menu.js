import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { menuController } from '../controllers/menuController.js';
import { uploadImages } from '../middleware/upload.js';

const router = Router();

// Public
router.get('/', menuController.getAll);
router.get('/:id', menuController.getById);

// Admin
router.get('/admin/all', authenticate, requireAdmin, menuController.adminGetAll);
router.post('/admin', authenticate, requireAdmin, uploadImages.array('images', 3), menuController.create);
router.patch('/admin/:id', authenticate, requireAdmin, uploadImages.array('images', 3), menuController.update);
router.patch('/admin/:id/status', authenticate, requireAdmin, menuController.updateStatus);
router.delete('/admin/:id', authenticate, requireAdmin, menuController.delete);

export default router;
