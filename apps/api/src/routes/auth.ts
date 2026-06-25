import { Router } from 'express';
import { login, getMe, verifySupervisor } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/verify-supervisor', verifySupervisor);
router.get('/me', authenticate, getMe);

export default router;
