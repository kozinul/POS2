import { Router } from 'express';
import {
  createTax,
  getTaxes,
  updateTax,
  deleteTax,
} from '../controllers/taxController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getTaxes);
router.post('/', authenticate, authorize('admin'), createTax);
router.put('/:id', authenticate, authorize('admin'), updateTax);
router.delete('/:id', authenticate, authorize('admin'), deleteTax);

export default router;
