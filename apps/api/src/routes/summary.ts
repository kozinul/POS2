import { Router } from 'express';
import { getSummary } from '../controllers/summaryController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getSummary);

export default router;
