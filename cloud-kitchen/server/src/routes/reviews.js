import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { reviewController } from '../controllers/reviewController.js';

const router = Router();

// Public: restaurant-level reviews
router.get('/restaurant', reviewController.listForRestaurant);

// Customer
router.get('/mine', authenticate, reviewController.myReviews);
router.post('/restaurant', authenticate, reviewController.upsert);
router.delete('/:reviewId', authenticate, reviewController.remove);

// Admin
router.get('/admin/all', authenticate, requireAdmin, reviewController.adminGetAll);
router.patch('/admin/:reviewId/hidden', authenticate, requireAdmin, reviewController.adminSetHidden);
router.delete('/admin/:reviewId', authenticate, requireAdmin, reviewController.adminRemove);

export default router;
