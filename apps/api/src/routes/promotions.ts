import { Router } from 'express';
import {
  createPromotion,
  getPromotions,
  getPromotion,
  getPromotionByCode,
  updatePromotion,
  deletePromotion,
} from '../controllers/promotionController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getPromotions);
router.get('/code/:code', getPromotionByCode);
router.get('/:id', getPromotion);
router.post('/', authenticate, authorize('admin'), createPromotion);
router.put('/:id', authenticate, authorize('admin'), updatePromotion);
router.delete('/:id', authenticate, authorize('admin'), deletePromotion);

export default router;
