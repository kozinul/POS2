import { Router } from 'express';
import {
  createDiscount,
  getDiscounts,
  updateDiscount,
  deleteDiscount,
} from '../controllers/discountController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getDiscounts);
router.post('/', authenticate, authorize('admin'), createDiscount);
router.put('/:id', authenticate, authorize('admin'), updateDiscount);
router.delete('/:id', authenticate, authorize('admin'), deleteDiscount);

export default router;
