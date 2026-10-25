import { ArrowUpRight, FileText, FolderOpen, Search, LoaderCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { WorkflowSummary } from '../types';
import { StatusBadge } from './StatusBadge';

interface WorkflowListProps {
  workflows: WorkflowSummary[];
  loading: boolean;
  onOpen: (workflowId: string) => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function WorkflowList({ workflows, loading, onOpen }: WorkflowListProps) {
  const [search, setSearch] = useState('');
  const filteredWorkflows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return workflows;
    return workflows.filter((workflow) => `${workflow.projectName} ${workflow.customer} ${workflow.status}`.toLowerCase().includes(term));
  }, [search, workflows]);

  return (
    <section aria-labelledby="workflows-title">
      <div className="page-heading heading-with-action">
        <div>
          <p className="eyebrow">WORKFLOW TRACKING</p>
          <h1 id="workflows-title">Workflows</h1>
          <p className="page-description">Track submitted documents, approval decisions, and signatures.</p>
        </div>
        <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search workflows" aria-label="Search workflows" /></label>
      </div>
      <div className="panel workflow-table-panel">
        <div className="panel-title-row"><div><h2>All workflows</h2><p>{filteredWorkflows.length} {filteredWorkflows.length === 1 ? 'workflow' : 'workflows'}</p></div></div>
        <div className="table-scroll">
          <table className="workflow-table">
            <thead><tr><th>Project</th><th>Status</th><th>Documents</th><th>Last updated</th><th><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5}><div className="table-message"><LoaderCircle className="spin" size={20} /> Loading workflows…</div></td></tr> : filteredWorkflows.length ? filteredWorkflows.map((workflow) => (
                <tr key={workflow.id}>
                  <td><div className="table-project"><span className="table-project-icon"><FileText size={18} /></span><span><strong>{workflow.projectName}</strong><small>{workflow.customer}</small></span></div></td>
                  <td><StatusBadge status={workflow.status} /></td>
                  <td>{workflow.documents.length} {workflow.documents.length === 1 ? 'file' : 'files'}</td>
                  <td>{formatDate(workflow.updatedAt || workflow.createdAt)}</td>
                  <td><button type="button" className="icon-button open-workflow" onClick={() => onOpen(workflow.id)} aria-label={`Open ${workflow.projectName}`}><ArrowUpRight size={17} /></button></td>
                </tr>
              )) : <tr><td colSpan={5}><div className="table-message empty-table"><FolderOpen size={23} /><strong>{search ? 'No matching workflows' : 'No workflows yet'}</strong><span>{search ? 'Try another project or customer name.' : 'Start a project to begin an approval workflow.'}</span></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
