import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { settingsController } from '../controllers/settingsController.js';

const router = Router();

// Public
router.get('/', settingsController.get);

// Admin
router.patch('/admin', authenticate, requireAdmin, settingsController.update);

export default router;
