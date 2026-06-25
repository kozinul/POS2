import { Router } from 'express';
import {
  createModifier,
  getModifiers,
  updateModifier,
  deleteModifier,
} from '../controllers/modifierController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getModifiers);
router.post('/', authenticate, authorize('admin'), createModifier);
router.put('/:id', authenticate, authorize('admin'), updateModifier);
router.delete('/:id', authenticate, authorize('admin'), deleteModifier);

export default router;
