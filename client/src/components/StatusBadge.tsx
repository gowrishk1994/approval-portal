import { CheckCircle2, Circle, Clock3, XCircle } from 'lucide-react';
import type { WorkflowStatus } from '../types';

const STATUS_DETAILS: Record<WorkflowStatus, { label: string; className: string; icon: typeof Circle }> = {
  draft: { label: 'Draft', className: 'status-neutral', icon: Circle },
  pending_approval: { label: 'Pending approval', className: 'status-warning', icon: Clock3 },
  rejected: { label: 'Changes requested', className: 'status-danger', icon: XCircle },
  approved: { label: 'Approved · signature required', className: 'status-warning', icon: Clock3 },
  pending_signature: { label: 'Awaiting signature', className: 'status-warning', icon: Clock3 },
  completed: { label: 'Completed', className: 'status-success', icon: CheckCircle2 },
};

interface StatusBadgeProps {
  status: WorkflowStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const details = STATUS_DETAILS[status];
  const Icon = details.icon;
  return (
    <span className={`status-badge ${details.className}`}>
      <Icon size={14} aria-hidden="true" />
      {details.label}
    </span>
  );
}
