import type { DocumentMetadata, Project, PortalUser, Workflow, WorkflowResponse, WorkflowSummary } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null;
}

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const { body, headers, ...init } = options;
  const requestHeaders = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    body,
    headers: requestHeaders,
  });
  const contentType = response.headers.get('content-type') ?? '';
  const payload: unknown = contentType.includes('application/json')
    ? await response.json()
    : await response.blob();

  if (!response.ok) {
    const message = isApiErrorPayload(payload) ? payload.error : 'The request could not be completed.';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

function isApiErrorPayload(value: unknown): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value && typeof value.error === 'string';
}

export const portalApi = {
  getCurrentUser(): Promise<PortalUser> {
    return request<PortalUser>('/auth/session', { method: 'GET' });
  },

  login(username: string, password: string): Promise<PortalUser> {
    return request<PortalUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  logout(): Promise<void> {
    return request<void>('/auth/logout', { method: 'POST' });
  },

  getProjects(): Promise<Project[]> {
    return request<Project[]>('/projects', { method: 'GET' });
  },

  getWorkflows(): Promise<WorkflowSummary[]> {
    return request<WorkflowSummary[]>('/workflows', { method: 'GET' });
  },

  getWorkflow(workflowId: string): Promise<Workflow> {
    return request<Workflow>(`/workflows/${encodeURIComponent(workflowId)}`, { method: 'GET' });
  },

  startWorkflow(projectId: string): Promise<WorkflowResponse> {
    return request<WorkflowResponse>('/workflows', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  },

  uploadDocuments(workflowId: string, files: File[]): Promise<WorkflowResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('documents', file));
    return request<WorkflowResponse>(`/workflows/${encodeURIComponent(workflowId)}/documents`, {
      method: 'POST',
      body: formData,
    });
  },

  requestApproval(workflowId: string): Promise<WorkflowResponse> {
    return request<WorkflowResponse>(`/workflows/${encodeURIComponent(workflowId)}/request-approval`, {
      method: 'POST',
    });
  },

  approve(workflowId: string): Promise<WorkflowResponse> {
    return request<WorkflowResponse>(`/workflows/${encodeURIComponent(workflowId)}/approve`, {
      method: 'POST',
    });
  },

  sign(workflowId: string, signatureName: string): Promise<WorkflowResponse> {
    return request<WorkflowResponse>(`/workflows/${encodeURIComponent(workflowId)}/sign`, {
      method: 'POST',
      body: JSON.stringify({ signatureName, consent: true }),
    });
  },

  downloadDocument(workflowId: string, document: DocumentMetadata): Promise<Blob> {
    return request<Blob>(`/workflows/${encodeURIComponent(workflowId)}/documents/${encodeURIComponent(document.id)}/download`, {
      method: 'GET',
    });
  },
};

export type { Project, Workflow, WorkflowResponse, WorkflowSummary };
