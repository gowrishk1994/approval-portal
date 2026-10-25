import { z } from 'zod';
import { getRequestActorId } from '../helpers/request-actor.js';
import { removeUploadedFiles } from '../helpers/file-storage.js';
import { asyncHandler } from '../helpers/async-handler.js';
import { HttpError } from '../helpers/http-error.js';
import { workflowService } from '../services/workflow.js';

const startWorkflowSchema = z.object({
  projectId: z.string().trim().min(1),
}).strict();

const signatureSchema = z.object({
  signatureName: z.string().trim().min(2).max(120),
  consent: z.literal(true),
}).strict();

function parseBody(schema, body, errorMessage) {
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, errorMessage);
  return result.data;
}

export function createWorkflowController({ service = workflowService } = {}) {
  return {
    list: asyncHandler(async (request, response) => {
      response.json(await service.listWorkflows(getRequestActorId(request)));
    }),

    getById: asyncHandler(async (request, response) => {
      response.json(await service.getWorkflow(getRequestActorId(request), request.params.id));
    }),

    start: asyncHandler(async (request, response) => {
      const { projectId } = parseBody(
        startWorkflowSchema,
        request.body,
        'projectId is required.',
      );
      const workflow = await service.startWorkflow(getRequestActorId(request), projectId);
      response.status(201).json(workflow);
    }),

    authorizeUpload: asyncHandler(async (request, _response, next) => {
      await service.assertCanUpload(getRequestActorId(request), request.params.id);
      next();
    }),

    uploadDocuments: asyncHandler(async (request, response) => {
      const files = request.files ?? [];
      try {
        const workflow = await service.uploadDocuments(
          getRequestActorId(request),
          request.params.id,
          files,
        );
        response.status(201).json(workflow);
      } catch (error) {
        await removeUploadedFiles(files);
        throw error;
      }
    }),

    requestApproval: asyncHandler(async (request, response) => {
      response.json(await service.requestApproval(
        getRequestActorId(request),
        request.params.id,
      ));
    }),

    approve: asyncHandler(async (request, response) => {
      response.json(await service.approve(getRequestActorId(request), request.params.id));
    }),

    sign: asyncHandler(async (request, response) => {
      const { signatureName } = parseBody(
        signatureSchema,
        request.body,
        'Enter your full name and confirm the signature declaration.',
      );
      response.json(await service.sign(getRequestActorId(request), request.params.id, signatureName));
    }),

    downloadDocument: asyncHandler(async (request, response, next) => {
      const result = await service.getDocumentForDownload(
        getRequestActorId(request),
        request.params.id,
        request.params.documentId,
      );
      response.download(result.filePath, result.document.originalName, (error) => {
        if (error && !response.headersSent) next(error);
      });
    }),
  };
}
