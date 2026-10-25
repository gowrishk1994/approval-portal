import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { portalApi } from '../../src/api/client';
import type { DocumentMetadata, PortalUser, Project, Workflow, WorkflowResponse, WorkflowSummary } from '../../src/types';

vi.mock('../../src/api/client', () => ({
  portalApi: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getProjects: vi.fn(),
    getWorkflows: vi.fn(),
    getWorkflow: vi.fn(),
    startWorkflow: vi.fn(),
    uploadDocuments: vi.fn(),
    requestApproval: vi.fn(),
    approve: vi.fn(),
    sign: vi.fn(),
    downloadDocument: vi.fn(),
  },
}));

const requester: PortalUser = { id: 'requester', name: 'Project Requester', role: 'requester' };
const approver: PortalUser = { id: 'user-a', name: 'User A', role: 'approver' };
const project: Project = {
  id: 'project-1001',
  name: 'Cloud Migration',
  customer: 'Northwind',
  customerContact: 'A. Contact',
  description: 'Move selected workloads to cloud infrastructure.',
};

let currentUser: PortalUser;
let currentWorkflow: Workflow;
let workflowSummaries: WorkflowSummary[];
let projectCatalog: Project[];

function makeWorkflow(status: Workflow['status']): Workflow {
  return {
    id: 'workflow-1',
    projectId: project.id,
    projectName: project.name,
    customer: project.customer,
    status,
    createdBy: requester.id,
    approverId: approver.id,
    approver: { id: approver.id, name: approver.name, email: 'approver@example.com' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    submittedAt: status === 'draft' ? null : '2026-01-01T01:00:00.000Z',
    approvedAt: ['approved', 'pending_signature', 'completed'].includes(status) ? '2026-01-02T00:00:00.000Z' : null,
    signedAt: status === 'completed' ? '2026-01-03T00:00:00.000Z' : null,
    rejectionReason: null,
    documents: [],
    signature: status === 'completed'
      ? { name: 'User A', signedBy: approver.id, signedAt: '2026-01-03T00:00:00.000Z', method: 'typed-name' }
      : null,
    auditEvents: [],
  };
}

function toResponse(workflow: Workflow): WorkflowResponse {
  const { signature: _signature, auditEvents: _auditEvents, ...summary } = workflow;
  return summary;
}

function addDocument(workflow: Workflow, file: File): DocumentMetadata {
  return {
    id: 'document-1',
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    uploadedAt: '2026-01-01T00:30:00.000Z',
  };
}

describe('approval portal functional flows', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    currentUser = requester;
    currentWorkflow = makeWorkflow('draft');
    workflowSummaries = [];
    projectCatalog = [project];

    vi.mocked(portalApi.getCurrentUser).mockImplementation(async () => currentUser);
    vi.mocked(portalApi.getProjects).mockImplementation(async () => projectCatalog);
    vi.mocked(portalApi.getWorkflows).mockImplementation(async () => workflowSummaries);
    vi.mocked(portalApi.getWorkflow).mockImplementation(async () => currentWorkflow);
    vi.mocked(portalApi.startWorkflow).mockImplementation(async (projectId) => {
      currentWorkflow = { ...makeWorkflow('draft'), projectId };
      workflowSummaries = [toResponse(currentWorkflow)];
      return toResponse(currentWorkflow);
    });
    vi.mocked(portalApi.uploadDocuments).mockImplementation(async (_workflowId, files) => {
      currentWorkflow = {
        ...currentWorkflow,
        documents: [...currentWorkflow.documents, ...files.map((file) => addDocument(currentWorkflow, file))],
      };
      workflowSummaries = [toResponse(currentWorkflow)];
      return toResponse(currentWorkflow);
    });
    vi.mocked(portalApi.requestApproval).mockImplementation(async () => {
      currentWorkflow = { ...currentWorkflow, status: 'pending_approval', submittedAt: '2026-01-01T01:00:00.000Z' };
      workflowSummaries = [toResponse(currentWorkflow)];
      return toResponse(currentWorkflow);
    });
    vi.mocked(portalApi.approve).mockImplementation(async () => {
      currentWorkflow = { ...currentWorkflow, status: 'approved', approvedAt: '2026-01-02T00:00:00.000Z' };
      workflowSummaries = [toResponse(currentWorkflow)];
      return { ...toResponse(currentWorkflow), notificationDelivered: true };
    });
    vi.mocked(portalApi.sign).mockImplementation(async (_workflowId, signatureName) => {
      currentWorkflow = {
        ...currentWorkflow,
        status: 'completed',
        signedAt: '2026-01-03T00:00:00.000Z',
        signature: {
          name: signatureName,
          signedBy: approver.id,
          signedAt: '2026-01-03T00:00:00.000Z',
          method: 'typed-name',
        },
      };
      workflowSummaries = [toResponse(currentWorkflow)];
      return toResponse(currentWorkflow);
    });
    vi.mocked(portalApi.login).mockImplementation(async () => currentUser);
    vi.mocked(portalApi.logout).mockResolvedValue(undefined);
    vi.mocked(portalApi.downloadDocument).mockResolvedValue(new Blob());
  });

  it('lets the requester start, upload, submit, and then hides the submitted project', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: 'Cloud Migration' });
    await user.click(screen.getByRole('button', { name: /start project/i }));
    await screen.findByRole('heading', { name: 'Cloud Migration', level: 1 });

    const file = new File(['%PDF-1.4 test'], 'proposal.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText(/choose files to upload/i), file);
    await user.click(screen.getByRole('button', { name: /upload documents/i }));
    await user.click(await screen.findByRole('button', { name: /request approval/i }));

    expect(await screen.findByText('Approval request saved.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /back to workflows/i }));

    expect(await screen.findByText('All available projects have already been sent for approval.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cloud Migration' })).not.toBeInTheDocument();
    expect(portalApi.requestApproval).toHaveBeenCalledWith('workflow-1');
  });

  it('opens the email signing link in a popup and completes the workflow', async () => {
    const user = userEvent.setup();
    currentUser = approver;
    currentWorkflow = makeWorkflow('approved');
    workflowSummaries = [toResponse(currentWorkflow)];
    window.history.replaceState({}, '', '/?workflow=workflow-1&action=sign');

    render(<App />);

    expect(await screen.findByRole('dialog', { name: 'Signature required' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Full name'), 'User A');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /sign and complete/i }));

    expect(await screen.findByRole('heading', { name: 'Workflow completed' })).toBeInTheDocument();
    expect(await screen.findByText('Document signed. Workflow completed.')).toBeInTheDocument();
    expect(portalApi.sign).toHaveBeenCalledWith('workflow-1', 'User A');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
