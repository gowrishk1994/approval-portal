import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';

const router = Router();
router.get('/projects', projectController.list);
export default router;
