import { Router } from 'express';
import {
  createOutlet,
  getOutlets,
  getOutlet,
  updateOutlet,
  deleteOutlet,
} from '../controllers/outletController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getOutlets);
router.get('/:id', getOutlet);
router.post('/', authenticate, authorize('admin'), createOutlet);
router.put('/:id', authenticate, authorize('admin'), updateOutlet);
router.delete('/:id', authenticate, authorize('admin'), deleteOutlet);

export default router;
