import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProjectCatalog } from '../../src/components/ProjectCatalog';
import type { PortalUser, Project } from '../../src/types';

const project: Project = {
  id: 'project-1001',
  name: 'Cloud Migration',
  customer: 'Northwind',
  customerContact: 'A. Contact',
  description: 'Move selected workloads to cloud infrastructure.',
};

const requester: PortalUser = { id: 'requester', name: 'Project Requester', role: 'requester' };
const approver: PortalUser = { id: 'user-a', name: 'User A', role: 'approver' };

describe('ProjectCatalog', () => {
  it('lets a requester start a listed project', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<ProjectCatalog projects={[project]} user={requester} loading={false} busy={false} onStart={onStart} />);

    expect(screen.getByRole('heading', { name: 'Cloud Migration' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /start project/i }));

    expect(onStart).toHaveBeenCalledWith(project);
  });

  it('does not let an approver start a requester project', () => {
    render(<ProjectCatalog projects={[project]} user={approver} loading={false} busy={false} onStart={vi.fn()} />);

    expect(screen.getByRole('button', { name: /start project/i })).toBeDisabled();
    expect(screen.getByText('Switch to a requester account to start a project.')).toBeInTheDocument();
  });

  it('shows the provided empty-state explanation', () => {
    render(
      <ProjectCatalog
        projects={[]}
        user={requester}
        loading={false}
        busy={false}
        emptyMessage="All available projects have already been sent for approval."
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByText('All available projects have already been sent for approval.')).toBeInTheDocument();
  });
});
