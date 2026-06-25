import { Router } from 'express';
import { getSalesReport, getFinanceReport, getCashierReport } from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/sales', authenticate, authorize('admin'), getSalesReport);
router.get('/finance', authenticate, authorize('admin'), getFinanceReport);
router.get('/cashier', authenticate, authorize('admin'), getCashierReport);

export default router;
