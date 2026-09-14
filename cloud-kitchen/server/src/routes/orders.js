import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { orderController } from '../controllers/orderController.js';

const router = Router();

// Public: QR image for order emails (the token itself is the credential)
router.get('/qr/:token', orderController.qrImage);

// Customer routes
router.post('/', authenticate, orderController.create);
router.get('/my-orders', authenticate, orderController.getMyOrders);
router.get('/:id', authenticate, orderController.getById);

// Admin routes
router.get('/admin/all', authenticate, requireAdmin, orderController.adminGetAll);
router.get('/admin/:id', authenticate, requireAdmin, orderController.adminGetById);
router.patch('/admin/:id/status', authenticate, requireAdmin, orderController.updateStatus);
router.patch('/admin/:id/estimated-time', authenticate, requireAdmin, orderController.updateEstimatedTime);
router.post('/admin/:id/cancel', authenticate, requireAdmin, orderController.cancel);
router.post('/admin/:id/complete', authenticate, requireAdmin, orderController.complete);
router.post('/admin/qr/verify', authenticate, requireAdmin, orderController.verifyQr);

export default router;
