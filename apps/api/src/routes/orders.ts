import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  getDailyReport,
  voidOrder,
  voidItem,
  voidPayment,
} from '../controllers/orderController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/report/daily', authorize('admin'), getDailyReport);
router.post('/:id/void', voidOrder);
router.post('/:id/void-item', voidItem);
router.post('/:id/void-payment', voidPayment);
router.get('/:id', getOrder);

export default router;
