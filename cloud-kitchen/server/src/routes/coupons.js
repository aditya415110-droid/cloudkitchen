import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { couponController } from '../controllers/couponController.js';

const router = Router();

// Public
router.get('/active', couponController.listActive);

// Customer
router.post('/validate', authenticate, couponController.validate);

// Admin
router.get('/admin/all', authenticate, requireAdmin, couponController.adminGetAll);
router.post('/admin', authenticate, requireAdmin, couponController.create);
router.patch('/admin/:id', authenticate, requireAdmin, couponController.update);
router.delete('/admin/:id', authenticate, requireAdmin, couponController.remove);

export default router;
