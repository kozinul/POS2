import { Router } from 'express';
import {
  createPaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
  deletePaymentMethod,
} from '../controllers/paymentMethodController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getPaymentMethods);
router.post('/', authenticate, authorize('admin'), createPaymentMethod);
router.put('/:id', authenticate, authorize('admin'), updatePaymentMethod);
router.delete('/:id', authenticate, authorize('admin'), deletePaymentMethod);

export default router;
