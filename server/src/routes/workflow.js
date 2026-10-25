import { Router } from 'express';
import { createWorkflowController } from '../controllers/workflow.controller.js';
import { documentUpload, MAX_DOCUMENTS_PER_REQUEST } from '../helpers/document-upload.js';
import { workflowService } from '../services/workflow.js';

export function createWorkflowRouter({ service = workflowService } = {}) {
  const router = Router();
  const controller = createWorkflowController({ service });

  router.get('/workflows', controller.list);
  router.post('/workflows', controller.start);
  router.get('/workflows/:id', controller.getById);
  router.post(
    '/workflows/:id/documents',
    controller.authorizeUpload,
    documentUpload.array('documents', MAX_DOCUMENTS_PER_REQUEST),
    controller.uploadDocuments,
  );
  router.post('/workflows/:id/request-approval', controller.requestApproval);
  router.post('/workflows/:id/approve', controller.approve);
  router.post('/workflows/:id/sign', controller.sign);
  router.get('/workflows/:id/documents/:documentId/download', controller.downloadDocument);

  return router;
}
