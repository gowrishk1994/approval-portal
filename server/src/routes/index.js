import { Router } from 'express';
import authRoutes from './auth.js';
import projectRoutes from './project.js';
import { createWorkflowRouter } from './workflow.js';
import { workflowService } from '../services/workflow.js';
import { requireAuthentication } from '../middleware/require-authentication.js';

export function createApiRouter({ service = workflowService } = {}) {
  const router = Router();
  router.use(authRoutes);
  router.use(requireAuthentication);
  router.use(projectRoutes);
  router.use(createWorkflowRouter({ service }));
  return router;
}
