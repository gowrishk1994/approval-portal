import { useEffect, useState, type ChangeEvent } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Mail,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import type { DocumentMetadata, PortalUser, Workflow } from '../types';
import { StatusBadge } from './StatusBadge';

interface WorkflowDetailProps {
  workflow: Workflow;
  user: PortalUser;
  signatureLinkOpened: boolean;
  busy: boolean;
  onBack: () => void;
  onUpload: (files: File[]) => Promise<boolean>;
  onRequestApproval: () => Promise<boolean>;
  onApprove: () => Promise<boolean>;
  onSign: (name: string) => Promise<boolean>;
  onDownload: (document: DocumentMetadata) => Promise<void>;
}

const WORKFLOW_STEPS = [
  { label: 'Project started', key: 'started' },
  { label: 'Documents uploaded', key: 'documents' },
  { label: 'Approval', key: 'approval' },
  { label: 'Signature', key: 'signature' },
] as const;

function formatDate(value: string, withTime = false) {
  return new Date(value).toLocaleString('en-IN', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' });
}

function getCompletedStepCount(workflow: Workflow) {
  if (workflow.status === 'completed') return 4;
  if (workflow.status === 'approved' || workflow.status === 'pending_signature') return 3;
  if (workflow.status === 'pending_approval' || workflow.status === 'rejected') return 2;
  if (workflow.documents.length > 0) return 2;
  return 1;
}

function humanizeAction(action: string) {
  return action.replaceAll('.', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function WorkflowDetail({
  workflow,
  user,
  signatureLinkOpened,
  busy,
  onBack,
  onUpload,
  onRequestApproval,
  onApprove,
  onSign,
  onDownload,
}: WorkflowDetailProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [signatureName, setSignatureName] = useState('');
  const [consent, setConsent] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(signatureLinkOpened);
  const isApprover = user.role === 'approver';
  const canUpload = !isApprover && workflow.status === 'draft';
  const completedSteps = getCompletedStepCount(workflow);

  useEffect(() => {
    if (!signatureModalOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setSignatureModalOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [signatureModalOpen, busy]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files.slice(0, 5));
    event.target.value = '';
  };

  const uploadSelectedFiles = async () => {
    if (!selectedFiles.length) return;
    const uploaded = await onUpload(selectedFiles);
    if (uploaded) setSelectedFiles([]);
  };

  const handleSign = async () => {
    const signed = await onSign(signatureName.trim());
    if (signed) {
      setSignatureName('');
      setConsent(false);
    }
  };

  return (
    <section aria-labelledby="workflow-title">
      <button type="button" className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to workflows</button>
      <div className="page-heading workflow-page-heading">
        <div>
          <p className="eyebrow">WORKFLOW DETAILS</p>
          <h1 id="workflow-title">{workflow.projectName}</h1>
          <p className="page-description">{workflow.customer} <span className="bullet-divider">·</span> Created {formatDate(workflow.createdAt)}</p>
        </div>
        <StatusBadge status={workflow.status} />
      </div>

      <div className="workflow-layout">
        <div className="workflow-primary-column">
          <section className="panel">
            <div className="panel-title-row"><div><h2>Workflow progress</h2><p>Track the required steps to complete this project.</p></div><span className="progress-number">{completedSteps} of 4</span></div>
            <div className="workflow-stepper" aria-label="Workflow progress">
              {WORKFLOW_STEPS.map((step, index) => {
                const isDone = index < completedSteps;
                const isCurrent = index === completedSteps && workflow.status !== 'completed';
                return <div className={`workflow-step ${isDone ? 'step-complete' : ''} ${isCurrent ? 'step-current' : ''}`} key={step.key}>
                  <span className="step-marker">{isDone ? <Check size={15} /> : index + 1}</span>
                  <span className="step-caption"><strong>{step.label}</strong><small>{isDone ? 'Completed' : isCurrent ? 'In progress' : 'Up next'}</small></span>
                  {index < WORKFLOW_STEPS.length - 1 && <span className={`step-connector ${index < completedSteps - 1 ? 'connector-complete' : ''}`} />}
                </div>;
              })}
            </div>
          </section>

          <section className="panel documents-panel">
            <div className="panel-title-row"><div><h2>Project documents</h2><p>Upload the bid and supporting project documents.</p></div><span className="subtle-badge">Up to 5 files per upload · 10 MB each</span></div>
            {workflow.documents.length ? (
              <div className="document-list">
                {workflow.documents.map((document) => <div className="document-row" key={document.id}>
                  <span className="document-icon"><FileText size={19} /></span>
                  <span className="document-info"><strong>{document.originalName}</strong><small>{(document.size / 1024).toFixed(0)} KB · Uploaded {formatDate(document.uploadedAt)}</small></span>
                  <button type="button" className="button button-quiet" onClick={() => void onDownload(document)}><Download size={15} /> Download</button>
                </div>)}
              </div>
            ) : <div className="empty-documents"><span><UploadCloud size={24} /></span><strong>No documents uploaded</strong><small>Upload at least one document before requesting approval.</small></div>}

            {canUpload && <div className="upload-section">
              <div className="upload-controls-row">
                <label className="upload-dropzone">
                  <span className="upload-icon"><UploadCloud size={22} /></span>
                  <span className="upload-copy"><strong>Choose files to upload</strong><small>PDF, PNG, JPG, DOC, DOCX <span aria-hidden="true">·</span> Up to 10 MB per file</small></span>
                  <span className="browse-files">Browse files</span>
                  <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={handleFileChange} />
                </label>
                <button type="button" className="button button-primary upload-submit" disabled={busy || selectedFiles.length === 0} onClick={() => void uploadSelectedFiles()}>
                  {busy ? 'Uploading…' : <><UploadCloud size={16} /> Upload documents</>}
                </button>
              </div>
              {selectedFiles.length > 0 && <div className="selected-file-list">
                {selectedFiles.map((file) => <div key={`${file.name}-${file.size}`}><FileText size={14} /><span>{file.name}</span><small>{(file.size / 1024).toFixed(0)} KB</small></div>)}
              </div>}
            </div>}
          </section>

          {workflow.status === 'pending_approval' && isApprover && <section className="panel decision-panel">
            <div className="decision-heading"><span className="decision-icon decision-warning"><Clock3 size={20} /></span><div><h2>Approval required</h2><p>Review the submitted documents before making a decision.</p></div></div>
            <button type="button" className="button button-primary" disabled={busy} onClick={() => void onApprove()}><CheckCircle2 size={16} /> Approve and request signature</button>
          </section>}

          {workflow.status === 'draft' && !isApprover && <section className="panel decision-panel">
            <div className="decision-heading"><span className="decision-icon decision-primary"><Mail size={20} /></span><div><h2>Request approval</h2><p>Submit the uploaded documents to User A for review.</p></div></div>
            <button type="button" className="button button-primary" disabled={busy || workflow.documents.length === 0} onClick={() => void onRequestApproval()}><Mail size={16} /> Request approval</button>
            {workflow.documents.length === 0 && <p className="field-hint">Upload at least one document before submitting this project.</p>}
          </section>}

          {workflow.status === 'completed' && <section className="panel completion-panel">
            <span className="completion-icon"><Check size={25} /></span><h2>Workflow completed</h2><p>The project has been approved and signed.</p>
            <div className="signature-receipt"><span>Signed by</span><strong>{workflow.signature?.name ?? 'User A'}</strong><small>{workflow.signedAt ? formatDate(workflow.signedAt, true) : ''}</small></div>
          </section>}
        </div>

        <aside className="workflow-secondary-column">
          <section className="panel summary-panel">
            <div className="panel-title-row"><div><h2>Project summary</h2><p>Project and approver details.</p></div></div>
            <dl className="summary-list">
              <div><dt>Customer</dt><dd>{workflow.customer}</dd></div>
              <div><dt>Project</dt><dd>{workflow.projectName}</dd></div>
              <div><dt>Workflow ID</dt><dd className="monospace">{workflow.id.slice(0, 12)}…</dd></div>
              <div><dt>Assigned approver</dt><dd><span className="approver-initials">UA</span><span className="approver-copy"><strong>User A</strong><small>gowrish2011@gmail.com</small></span></dd></div>
              <div><dt>Created</dt><dd>{formatDate(workflow.createdAt)}</dd></div>
              {workflow.approvedAt && <div><dt>Approved</dt><dd>{formatDate(workflow.approvedAt)}</dd></div>}
              {workflow.signedAt && <div><dt>Signed</dt><dd>{formatDate(workflow.signedAt)}</dd></div>}
            </dl>
          </section>
          <section className="panel activity-panel">
            <div className="panel-title-row"><div><h2>Activity</h2><p>Recorded workflow events.</p></div></div>
            {workflow.auditEvents.length ? <ol className="activity-list">
              {[...workflow.auditEvents].reverse().map((event) => <li key={event.id}><span className="activity-marker"><Check size={12} /></span><span className="activity-copy"><strong>{humanizeAction(event.action)}</strong><small>{formatDate(event.createdAt, true)}</small></span></li>)}
            </ol> : <p className="muted-copy">No activity recorded yet.</p>}
          </section>
          <div className="security-note"><ShieldCheck size={18} /><span><strong>Workflow audit trail</strong><small>Workflow changes and signature actions are recorded.</small></span></div>
        </aside>
      </div>

      {signatureModalOpen && (workflow.status === 'approved' || workflow.status === 'pending_signature') && isApprover && <div
        className="signature-modal-backdrop"
        onClick={(event) => {
          if (event.target === event.currentTarget && !busy) setSignatureModalOpen(false);
        }}
      >
        <section className="panel decision-panel signature-modal" role="dialog" aria-modal="true" aria-labelledby="signature-modal-title">
          <div className="signature-modal-heading">
            <div className="decision-heading">
              <span className="decision-icon decision-success"><FileCheck2 size={20} /></span>
              <div><h2 id="signature-modal-title">Signature required</h2><p>Approval is complete. Review the project document and enter your name to sign.</p></div>
            </div>
            <button type="button" className="signature-modal-close" aria-label="Close signature dialog" disabled={busy} onClick={() => setSignatureModalOpen(false)}><X size={18} /></button>
          </div>
          <label className="form-label" htmlFor="signature-name">Full name</label>
          <input autoFocus className="text-field" id="signature-name" value={signatureName} onChange={(event) => setSignatureName(event.target.value)} maxLength={120} placeholder="Enter your full name" />
          <label className="consent-control"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I confirm that I have reviewed the document and intend to sign.</span></label>
          <button type="button" className="button button-primary" disabled={busy || signatureName.trim().length < 2 || !consent} onClick={() => void handleSign()}><FileCheck2 size={16} /> Sign and complete</button>
          <p className="form-note">The typed-name signature is consider as a valid form of electronic signature.</p>
        </section>
      </div>}
    </section>
  );
}
