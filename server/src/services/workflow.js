import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AuditEvent, Document, Project, User, Workflow } from '../models/index.js';
import { HttpError } from '../helpers/http-error.js';
import { toPublicWorkflow } from '../helpers/workflow-serializer.js';
import { createNotificationService } from './notification.js';
import { documentService } from './document.js';

const editableStatuses = ['draft'];

function toWorkflowData(instance) {
  if (!instance) return null;
  const { signatureJson, ...workflow } = instance.get({ plain: true });
  let signature = null;
  if (signatureJson) {
    try {
      signature = JSON.parse(signatureJson);
    } catch {
      throw new HttpError(500, 'The stored signature record is invalid.');
    }
  }
  return { ...workflow, signature };
}

function toAuditEventData(instance) {
  const { detailsJson, ...event } = instance.get({ plain: true });
  let details = {};
  try {
    details = JSON.parse(detailsJson || '{}');
  } catch {
    details = { parsingError: true };
  }
  return { ...event, details };
}

async function requireUser(actorId, requiredRole, transaction) {
  if (!actorId) throw new HttpError(401, 'A workspace account is required.');
  const user = await User.findByPk(actorId, transaction ? { transaction } : undefined);
  if (!user) throw new HttpError(401, 'Unknown workspace account.');
  if (requiredRole && user.role !== requiredRole) {
    throw new HttpError(403, `This action requires the ${requiredRole} role.`);
  }
  return user;
}

async function requireWorkflow(workflowId, transaction) {
  const workflow = await Workflow.findByPk(workflowId, { transaction });
  if (!workflow) throw new HttpError(404, 'Workflow not found.');
  return workflow;
}

function requireWorkflowAccess(user, workflow, action = 'view') {
  const canAccess = user.role === 'approver'
    ? workflow.approverId === user.id
    : workflow.createdBy === user.id;
  if (!canAccess) {
    const messages = {
      view: 'You cannot view this workflow.',
      edit: 'You cannot edit this workflow.',
      submit: 'You cannot submit this workflow.',
      download: 'You cannot download this document.',
    };
    throw new HttpError(403, messages[action] || 'You are not allowed to access this workflow.');
  }
}

async function assertCanUpload(actorId, workflowId) {
  const actor = await requireUser(actorId, 'requester');
  const workflow = await requireWorkflow(workflowId);
  requireWorkflowAccess(actor, workflow, 'edit');
  if (!editableStatuses.includes(workflow.status)) {
    throw new HttpError(409, 'Documents can only be uploaded while the workflow is a draft.');
  }
}

async function recordAudit({ workflowId, actorId, action, details = {}, transaction }) {
  await AuditEvent.create({
    id: crypto.randomUUID(),
    workflowId,
    actorId,
    action,
    detailsJson: JSON.stringify(details),
    createdAt: new Date(),
  }, { transaction });
}

async function hydrateWorkflow(workflowId, { includeAuditEvents = false } = {}) {
  const workflowInstance = await requireWorkflow(workflowId);
  const [documents, auditEvents, approver] = await Promise.all([
    Document.findAll({ where: { workflowId }, order: [['uploadedAt', 'ASC']] }),
    includeAuditEvents
      ? AuditEvent.findAll({ where: { workflowId }, order: [['createdAt', 'ASC'], ['id', 'ASC']] })
      : Promise.resolve([]),
    User.findByPk(workflowInstance.approverId, {
      attributes: ['id', 'name', 'email'],
      raw: true,
    }),
  ]);
  if (!approver) throw new HttpError(500, 'The assigned approver account was not found.');
  const workflow = toWorkflowData(workflowInstance);
  workflow.documents = documents.map((document) => document.get({ plain: true }));
  workflow.approver = approver;
  if (includeAuditEvents) workflow.auditEvents = auditEvents.map(toAuditEventData);
  return toPublicWorkflow(workflow, { includeAuditEvents });
}

async function updateWorkflowState({ workflow, patch, expectedStatuses, transaction, conflictMessage }) {
  const [updatedCount] = await Workflow.update(
    { ...patch, updatedAt: new Date() },
    {
      where: {
        id: workflow.id,
        status: Array.isArray(expectedStatuses) ? { [Op.in]: expectedStatuses } : expectedStatuses,
      },
      transaction,
    },
  );
  if (updatedCount !== 1) throw new HttpError(409, conflictMessage);
}

export function createWorkflowService({ notify, logger = console } = {}) {
  const notifier = notify ?? createNotificationService({ logger }).send;

  async function notifySafely(payload) {
    try {
      const result = await notifier(payload);
      return result?.delivered ?? true;
    } catch (error) {
      logger.error?.(`[notification-error] type=${payload.type} workflow=${payload.workflowId}`, error);
      return false;
    }
  }

  return {
    async listWorkflows(actorId) {
      const actor = await requireUser(actorId);
      const where = actor.role === 'approver' ? { approverId: actor.id } : { createdBy: actor.id };
      const instances = await Workflow.findAll({ where, order: [['updatedAt', 'DESC']] });
      if (instances.length === 0) return [];

      const workflowIds = instances.map(({ id }) => id);
      const documents = await Document.findAll({
        where: { workflowId: { [Op.in]: workflowIds } },
        order: [['uploadedAt', 'ASC']],
      });
      const documentsByWorkflow = new Map();
      for (const document of documents) {
        const data = document.get({ plain: true });
        const existing = documentsByWorkflow.get(data.workflowId) ?? [];
        existing.push(data);
        documentsByWorkflow.set(data.workflowId, existing);
      }

      return instances.map((instance) => toPublicWorkflow({
        ...toWorkflowData(instance),
        documents: documentsByWorkflow.get(instance.id) ?? [],
      }));
    },

    async getWorkflow(actorId, workflowId) {
      const actor = await requireUser(actorId);
      const workflow = await requireWorkflow(workflowId);
      requireWorkflowAccess(actor, workflow);
      return hydrateWorkflow(workflow.id, { includeAuditEvents: true });
    },

    async startWorkflow(actorId, projectId) {
      const workflowId = await sequelize.transaction(async (transaction) => {
        const actor = await requireUser(actorId, 'requester', transaction);
        const project = await Project.findByPk(projectId, { transaction });
        if (!project) throw new HttpError(404, 'Project not found.');
        const approver = await User.findOne({
          where: { role: 'approver' },
          order: [['id', 'ASC']],
          transaction,
        });
        if (!approver) throw new HttpError(500, 'No approver is configured for new workflows.');

        const now = new Date();
        const workflow = await Workflow.create({
          id: crypto.randomUUID(),
          projectId: project.id,
          projectName: project.name,
          customer: project.customer,
          status: 'draft',
          createdBy: actor.id,
          approverId: approver.id,
          createdAt: now,
          updatedAt: now,
        }, { transaction });
        await recordAudit({
          workflowId: workflow.id,
          actorId: actor.id,
          action: 'workflow.created',
          details: { projectId: project.id },
          transaction,
        });
        return workflow.id;
      });
      return hydrateWorkflow(workflowId);
    },

    assertCanUpload(actorId, workflowId) {
      return assertCanUpload(actorId, workflowId);
    },

    async uploadDocuments(actorId, workflowId, uploadedFiles) {
      if (!uploadedFiles.length) throw new HttpError(400, 'Choose at least one document.');
      if (uploadedFiles.some((file) => !Number.isInteger(file.size) || file.size <= 0)) {
        throw new HttpError(400, 'Empty documents are not allowed.');
      }

      await sequelize.transaction(async (transaction) => {
        const actor = await requireUser(actorId, 'requester', transaction);
        const workflow = await requireWorkflow(workflowId, transaction);
        requireWorkflowAccess(actor, workflow, 'edit');
        if (!editableStatuses.includes(workflow.status)) {
          throw new HttpError(409, 'Documents can only be uploaded while the workflow is a draft.');
        }

        const records = documentService.createRecords(workflowId, uploadedFiles);
        await documentService.insertRecords(records, transaction);
        await updateWorkflowState({
          workflow,
          patch: {},
          expectedStatuses: 'draft',
          transaction,
          conflictMessage: 'Workflow state changed while documents were uploading. Please retry.',
        });
        await recordAudit({
          workflowId: workflow.id,
          actorId: actor.id,
          action: 'documents.uploaded',
          details: { count: records.length },
          transaction,
        });
      });

      return hydrateWorkflow(workflowId);
    },

    async requestApproval(actorId, workflowId) {
      const submittedWorkflowId = await sequelize.transaction(async (transaction) => {
        const actor = await requireUser(actorId, 'requester', transaction);
        const workflow = await requireWorkflow(workflowId, transaction);
        requireWorkflowAccess(actor, workflow, 'submit');
        if (!editableStatuses.includes(workflow.status)) {
          throw new HttpError(409, 'Workflow is not ready for approval.');
        }
        const documentCount = await Document.count({ where: { workflowId: workflow.id }, transaction });
        if (documentCount === 0) throw new HttpError(400, 'Upload at least one document before requesting approval.');

        const now = new Date();
        await updateWorkflowState({
          workflow,
          patch: { status: 'pending_approval', submittedAt: now },
          expectedStatuses: editableStatuses,
          transaction,
          conflictMessage: 'Workflow is not ready for approval.',
        });
        await recordAudit({
          workflowId: workflow.id,
          actorId: actor.id,
          action: 'approval.requested',
          details: { approverId: workflow.approverId },
          transaction,
        });
        return workflow.id;
      });

      return hydrateWorkflow(submittedWorkflowId);
    },

    async approve(actorId, workflowId) {
      const approval = await sequelize.transaction(async (transaction) => {
        const actor = await requireUser(actorId, 'approver', transaction);
        const workflow = await requireWorkflow(workflowId, transaction);
        if (workflow.approverId !== actor.id) {
          throw new HttpError(403, 'Only the assigned approver can approve this workflow.');
        }
        if (workflow.status !== 'pending_approval') {
          throw new HttpError(409, 'Only pending requests can be approved.');
        }
        const now = new Date();
        await updateWorkflowState({
          workflow,
          patch: { status: 'approved', approvedAt: now },
          expectedStatuses: 'pending_approval',
          transaction,
          conflictMessage: 'Only pending requests can be approved.',
        });
        await recordAudit({
          workflowId: workflow.id,
          actorId: actor.id,
          action: 'approval.approved',
          transaction,
        });
        return { workflowId: workflow.id, projectName: workflow.projectName, approverEmail: actor.email };
      });

      const notificationDelivered = await notifySafely({
        type: 'signature-request',
        to: approval.approverEmail,
        workflowId: approval.workflowId,
        projectName: approval.projectName,
      });
      return { ...(await hydrateWorkflow(approval.workflowId)), notificationDelivered };
    },

    async sign(actorId, workflowId, signatureName) {
      await sequelize.transaction(async (transaction) => {
        const actor = await requireUser(actorId, 'approver', transaction);
        const workflow = await requireWorkflow(workflowId, transaction);
        if (workflow.approverId !== actor.id) {
          throw new HttpError(403, 'Only the assigned approver can sign this workflow.');
        }
        if (!['approved', 'pending_signature'].includes(workflow.status)) {
          throw new HttpError(409, 'This workflow is not awaiting a signature.');
        }

        const signedAt = new Date();
        const signature = {
          name: signatureName,
          signedBy: actor.id,
          signedAt: signedAt.toISOString(),
          method: 'typed-name',
        };
        await updateWorkflowState({
          workflow,
          patch: { status: 'completed', signatureJson: JSON.stringify(signature), signedAt },
          expectedStatuses: ['approved', 'pending_signature'],
          transaction,
          conflictMessage: 'This workflow is not awaiting a signature.',
        });
        await recordAudit({
          workflowId: workflow.id,
          actorId: actor.id,
          action: 'document.signed',
          details: { method: 'typed-name' },
          transaction,
        });
      });
      return hydrateWorkflow(workflowId);
    },

    async getDocumentForDownload(actorId, workflowId, documentId) {
      const actor = await requireUser(actorId);
      const workflow = await requireWorkflow(workflowId);
      requireWorkflowAccess(actor, workflow, 'download');
      const result = await documentService.findForDownload(workflowId, documentId);
      if (!result) throw new HttpError(404, 'Document not found.');
      return result;
    },
  };
}

export const workflowService = createWorkflowService();
