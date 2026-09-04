import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authController } from '../controllers/authController.js';

const router = Router();

router.get('/me', authenticate, authController.getMe);

export default router;
