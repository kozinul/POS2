import { Router } from 'express';
import {
  openClosing,
  closeClosing,
  getActiveClosing,
  getClosings,
  pickupCash,
  getCashierReport,
} from '../controllers/closingController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin'), getClosings);
router.get('/active', getActiveClosing);
router.get('/report', getCashierReport);
router.post('/open', openClosing);
router.post('/:id/close', closeClosing);
router.post('/:id/pickup', pickupCash);

export default router;
