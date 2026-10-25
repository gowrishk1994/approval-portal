export type UserRole = 'requester' | 'approver';

export interface PortalUser {
  id: string;
  name: string;
  role: UserRole;
}

export interface Project {
  id: string;
  name: string;
  customer: string;
  customerContact: string;
  description: string;
}

export type WorkflowStatus =
  | 'draft'
  | 'pending_approval'
  | 'rejected'
  | 'approved'
  | 'pending_signature'
  | 'completed';

export interface DocumentMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface Signature {
  name: string;
  signedBy: string;
  signedAt: string;
  method: string;
}

export interface AuditEvent {
  id: string;
  workflowId: string;
  actorId: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface WorkflowSummary {
  id: string;
  projectId: string;
  projectName: string;
  customer: string;
  status: WorkflowStatus;
  createdBy: string;
  approverId: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  signedAt: string | null;
  rejectionReason: string | null;
  documents: DocumentMetadata[];
}

export interface Workflow extends WorkflowSummary {
  approver: Pick<PortalUser, 'id' | 'name'> & { email: string };
  signature: Signature | null;
  auditEvents: AuditEvent[];
}

export interface WorkflowResponse extends WorkflowSummary {
  notificationDelivered?: boolean;
}
