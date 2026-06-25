import { Router } from 'express';
import { getSettings, updateSetting } from '../controllers/settingController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', getSettings);
router.put('/', authenticate, authorize('admin'), updateSetting);

export default router;
