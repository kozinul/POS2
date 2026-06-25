import { Router } from 'express';
import {
  createMember,
  getMembers,
  getMember,
  updateMember,
  deleteMember,
  searchMembers,
} from '../controllers/memberController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/search', searchMembers);
router.get('/', getMembers);
router.get('/:id', getMember);
router.post('/', authenticate, authorize('admin'), createMember);
router.put('/:id', authenticate, authorize('admin'), updateMember);
router.delete('/:id', authenticate, authorize('admin'), deleteMember);

export default router;
