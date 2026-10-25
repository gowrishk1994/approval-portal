import { useCallback, useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { FeedbackBanner } from './components/FeedbackBanner';
import { ProjectCatalog } from './components/ProjectCatalog';
import { WorkflowDetail } from './components/WorkflowDetail';
import { WorkflowList } from './components/WorkflowList';
import { LoginPage } from './components/LoginPage';
import { portalApi } from './api/client';
import type { Project, PortalUser, Workflow, WorkflowSummary } from './types';

type Page = 'projects' | 'workflows' | 'details';

export default function App() {
  const initialSignatureLink = new URLSearchParams(window.location.search).get('action') === 'sign'
    ? new URLSearchParams(window.location.search).get('workflow')
    : null;
  const [user, setUser] = useState<PortalUser | null>(null);
  const [page, setPage] = useState<Page>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [signatureLinkWorkflowId] = useState<string | null>(initialSignatureLink);

  useEffect(() => {
    portalApi.getCurrentUser()
      .then(setUser)
      .catch((cause: unknown) => {
        if (!(cause instanceof Error && 'status' in cause && cause.status === 401)) {
          setError(cause instanceof Error ? cause.message : 'Unable to check your sign-in status.');
        }
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [projectData, workflowData] = await Promise.all([
        portalApi.getProjects(),
        portalApi.getWorkflows(),
      ]);
      setProjects(projectData);
      setWorkflows(workflowData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the workspace.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const refreshSelectedWorkflow = useCallback(async (workflowId: string) => {
    const workflow = await portalApi.getWorkflow(workflowId);
    setSelectedWorkflow(workflow);
    return workflow;
  }, []);

  const openWorkflow = useCallback(async (workflowId: string) => {
    setBusy(true);
    setError('');
    try {
      await refreshSelectedWorkflow(workflowId);
      setPage('details');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open the workflow.');
    } finally {
      setBusy(false);
    }
  }, [refreshSelectedWorkflow]);

  useEffect(() => {
    if (!user || !signatureLinkWorkflowId) return;
    if (user.role !== 'approver') {
      setError('This signature link is only available to the assigned approver.');
      return;
    }
    void openWorkflow(signatureLinkWorkflowId);
  }, [user?.id, signatureLinkWorkflowId, openWorkflow]);

  const startWorkflow = async (project: Project) => {
    if (!user) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const workflow = await portalApi.startWorkflow(project.id);
      await loadWorkspace();
      await refreshSelectedWorkflow(workflow.id);
      setPage('details');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start the project.');
    } finally {
      setBusy(false);
    }
  };

  const runWorkflowAction = async (action: () => Promise<unknown>, successMessage: string, refresh = true): Promise<boolean> => {
    if (!selectedWorkflow) return false;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await action();
      if (refresh) {
        await refreshSelectedWorkflow(selectedWorkflow.id);
        await loadWorkspace();
      }
      const notificationDelivered = typeof result === 'object' && result !== null && 'notificationDelivered' in result
        ? result.notificationDelivered
        : undefined;
      setNotice(notificationDelivered === true
        ? `${successMessage} An email notification was sent to ${selectedWorkflow.approver.name}.`
        : notificationDelivered === false
          ? `${successMessage} Email notification could not be sent. Configure SMTP in server/.env.`
          : successMessage);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the workflow.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (files: File[]): Promise<boolean> => {
    if (!selectedWorkflow) return false;
    return runWorkflowAction(() => portalApi.uploadDocuments(selectedWorkflow.id, files), 'Documents uploaded successfully.');
  };

  const handleDownload = async (document: NonNullable<Workflow['documents']>[number]) => {
    if (!selectedWorkflow) return;
    setError('');
    try {
      const blob = await portalApi.downloadDocument(selectedWorkflow.id, document);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to download this document.');
    }
  };

  const handleLogin = async (username: string, password: string) => {
    setLoginLoading(true);
    setError('');
    try {
      const loggedInUser = await portalApi.login(username, password);
      setUser(loggedInUser);
      setPage(loggedInUser.role === 'approver' ? 'workflows' : 'projects');
      setSelectedWorkflow(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await portalApi.logout();
      setUser(null);
      setSelectedWorkflow(null);
      setProjects([]);
      setWorkflows([]);
      setPage('projects');
      setError('');
      setNotice('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign out.');
    }
  };

  const navigate = (nextPage: 'projects' | 'workflows') => {
    if (!user) return;
    if (nextPage === 'workflows' && user.role !== 'approver') return;
    setPage(nextPage);
    setSelectedWorkflow(null);
    setError('');
    setNotice('');
  };

  const requesterProjects = projects.filter((project) => !workflows.some(
    (workflow) => workflow.projectId === project.id && workflow.status !== 'draft',
  ));

  if (!user) {
    if (authLoading) return <main className="workspace-loading"><div className="loading-state">Loading sign-in…</div></main>;
    return <LoginPage loading={loginLoading} error={error} onLogin={(username, password) => void handleLogin(username, password)} />;
  }

  return (
    <AppShell
      page={page === 'details' ? (user.role === 'requester' ? 'projects' : 'workflows') : page}
      user={user}
      workflowCount={user.role === 'approver'
        ? workflows.filter((workflow) => ['pending_approval', 'approved', 'pending_signature'].includes(workflow.status)).length
        : workflows.length}
      onNavigate={navigate}
      onLogout={() => void handleLogout()}
    >
      {error && <FeedbackBanner kind="error" message={error} onDismiss={() => setError('')} />}
      {notice && <FeedbackBanner kind="success" message={notice} onDismiss={() => setNotice('')} />}

      {page === 'projects' && <ProjectCatalog
        projects={user.role === 'requester' ? requesterProjects : projects}
        user={user}
        loading={loading}
        busy={busy}
        emptyMessage={user.role === 'requester' && projects.length > 0 && requesterProjects.length === 0
          ? 'All available projects have already been sent for approval.'
          : undefined}
        onStart={startWorkflow}
      />}
      {page === 'workflows' && <WorkflowList workflows={workflows} loading={loading} onOpen={(id) => void openWorkflow(id)} />}
      {page === 'details' && selectedWorkflow && <WorkflowDetail
        workflow={selectedWorkflow}
        user={user}
        signatureLinkOpened={signatureLinkWorkflowId === selectedWorkflow.id}
        busy={busy}
        onBack={() => navigate(user.role === 'requester' ? 'projects' : 'workflows')}
        onUpload={handleUpload}
        onRequestApproval={() => runWorkflowAction(
          () => portalApi.requestApproval(selectedWorkflow.id),
          'Approval request saved.',
        )}
        onApprove={() => runWorkflowAction(
          () => portalApi.approve(selectedWorkflow.id),
          'Project approved. Signature request created.',
        )}
        onSign={(name) => runWorkflowAction(
          () => portalApi.sign(selectedWorkflow.id, name),
          'Document signed. Workflow completed.',
        )}
        onDownload={handleDownload}
      />}
      {page === 'details' && !selectedWorkflow && <div className="loading-state"><span>Choose a workflow to view details.</span></div>}
    </AppShell>
  );
}
