import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WorkflowDetail } from '../../src/components/WorkflowDetail';
import type { PortalUser, Workflow } from '../../src/types';

const approver: PortalUser = { id: 'user-a', name: 'User A', role: 'approver' };

const approvedWorkflow: Workflow = {
  id: 'workflow-1',
  projectId: 'project-1001',
  projectName: 'Cloud Migration',
  customer: 'Northwind',
  status: 'approved',
  createdBy: 'requester',
  approverId: 'user-a',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  submittedAt: '2026-01-01T01:00:00.000Z',
  approvedAt: '2026-01-02T00:00:00.000Z',
  signedAt: null,
  rejectionReason: null,
  documents: [],
  signature: null,
  auditEvents: [],
};

function renderWorkflow(signatureLinkOpened: boolean, onSign = vi.fn(async () => true)) {
  return {
    onSign,
    ...render(
      <WorkflowDetail
        workflow={approvedWorkflow}
        user={approver}
        signatureLinkOpened={signatureLinkOpened}
        busy={false}
        onBack={vi.fn()}
        onUpload={vi.fn(async () => true)}
        onRequestApproval={vi.fn(async () => true)}
        onApprove={vi.fn(async () => true)}
        onSign={onSign}
        onDownload={vi.fn(async () => undefined)}
      />,
    ),
  };
}

describe('WorkflowDetail', () => {
  it('does not show the signature popup during normal workflow browsing', () => {
    renderWorkflow(false);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the signature popup from an email link and submits a signature', async () => {
    const user = userEvent.setup();
    const onSign = vi.fn(async () => true);
    renderWorkflow(true, onSign);

    expect(await screen.findByRole('dialog', { name: 'Signature required' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Full name'), 'User A');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /sign and complete/i }));

    expect(onSign).toHaveBeenCalledWith('User A');
  });

  it('requires consent before enabling signature submission', async () => {
    const user = userEvent.setup();
    renderWorkflow(true);
    await user.type(await screen.findByLabelText('Full name'), 'User A');

    expect(screen.getByRole('button', { name: /sign and complete/i })).toBeDisabled();
  });
});
