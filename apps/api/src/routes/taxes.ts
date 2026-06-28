import { Router } from 'express';
import {
  createTax,
  getTaxes,
  getTax,
  updateTax,
  deleteTax,
  calculateTransactionTax,
  getProductTaxDisplay,
  validateTaxes,
  createTaxRule,
  getTaxRules,
  getTaxRule,
  updateTaxRule,
  deleteTaxRule,
} from '../controllers/taxController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Tax CRUD
router.get('/', getTaxes);
router.get('/:id', getTax);
router.post('/', authenticate, authorize('admin'), createTax);
router.put('/:id', authenticate, authorize('admin'), updateTax);
router.delete('/:id', authenticate, authorize('admin'), deleteTax);

// Tax calculation & validation
router.post('/calculate', authenticate, calculateTransactionTax);
router.get('/product/display', getProductTaxDisplay);
router.get('/validate/:id?', authenticate, authorize('admin'), validateTaxes);

// Tax Rules (for future regulation changes)
router.get('/rules/list', getTaxRules);
router.get('/rules/:id', getTaxRule);
router.post('/rules', authenticate, authorize('admin'), createTaxRule);
router.put('/rules/:id', authenticate, authorize('admin'), updateTaxRule);
router.delete('/rules/:id', authenticate, authorize('admin'), deleteTaxRule);

export default router;
