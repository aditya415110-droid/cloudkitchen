import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { settingsController } from '../controllers/settingsController.js';

const router = Router();

// Public
router.get('/', settingsController.get);

// Admin
router.patch('/admin', authenticate, requireAdmin, settingsController.update);

// Email diagnostics
router.get('/admin/email-status', authenticate, requireAdmin, settingsController.emailStatus);
router.post('/admin/email-test', authenticate, requireAdmin, settingsController.sendTestEmail);

export default router;
