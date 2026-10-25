import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';

const router = Router();
router.post('/auth/login', authController.login);
router.get('/auth/session', authController.session);
router.post('/auth/logout', authController.logout);
export default router;
