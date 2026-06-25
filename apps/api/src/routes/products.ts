import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getPopularProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getProducts);
router.get('/popular', getPopularProducts);
router.get('/:id', getProduct);
router.post('/', authenticate, authorize('admin'), createProduct);
router.put('/:id', authenticate, authorize('admin'), updateProduct);
router.delete('/:id', authenticate, authorize('admin'), deleteProduct);

export default router;
