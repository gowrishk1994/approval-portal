import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkflowList } from '../../src/components/WorkflowList';
import type { WorkflowSummary } from '../../src/types';

const workflows: WorkflowSummary[] = [
  {
    id: 'workflow-1',
    projectId: 'project-1001',
    projectName: 'Cloud Migration',
    customer: 'Northwind',
    status: 'pending_approval',
    createdBy: 'requester',
    approverId: 'user-a',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    submittedAt: '2026-01-01T00:00:00.000Z',
    approvedAt: null,
    signedAt: null,
    rejectionReason: null,
    documents: [],
  },
  {
    id: 'workflow-2',
    projectId: 'project-1002',
    projectName: 'Analytics Modernization',
    customer: 'Contoso',
    status: 'approved',
    createdBy: 'requester',
    approverId: 'user-a',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    submittedAt: '2026-01-02T00:00:00.000Z',
    approvedAt: '2026-01-02T00:00:00.000Z',
    signedAt: null,
    rejectionReason: null,
    documents: [],
  },
];

describe('WorkflowList', () => {
  it('filters workflows by project or customer', () => {
    render(<WorkflowList workflows={workflows} loading={false} onOpen={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search workflows' }), { target: { value: 'contoso' } });

    expect(screen.getByText('Analytics Modernization')).toBeInTheDocument();
    expect(screen.queryByText('Cloud Migration')).not.toBeInTheDocument();
  });

  it('opens the selected workflow', () => {
    const onOpen = vi.fn();
    render(<WorkflowList workflows={workflows} loading={false} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Cloud Migration' }));
    expect(onOpen).toHaveBeenCalledWith('workflow-1');
  });
});
