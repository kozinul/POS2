import { Router } from 'express';
import {
  createFamily,
  getFamilies,
  updateFamily,
  deleteFamily,
} from '../controllers/familyController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getFamilies);
router.post('/', authenticate, authorize('admin'), createFamily);
router.put('/:id', authenticate, authorize('admin'), updateFamily);
router.delete('/:id', authenticate, authorize('admin'), deleteFamily);

export default router;
