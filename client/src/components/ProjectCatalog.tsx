import { ArrowUpRight, Building2, Clock3, UserRound, FolderOpen, LoaderCircle } from 'lucide-react';
import type { Project, PortalUser } from '../types';

interface ProjectCatalogProps {
  projects: Project[];
  user: PortalUser;
  loading: boolean;
  busy: boolean;
  emptyMessage?: string;
  onStart: (project: Project) => void;
}

export function ProjectCatalog({ projects, user, loading, busy, emptyMessage, onStart }: ProjectCatalogProps) {
  const canStartWorkflow = user.role === 'requester';

  return (
    <section aria-labelledby="projects-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PROJECT OPERATIONS</p>
          <h1 id="projects-title">Projects</h1>
          <p className="page-description">Select a project to upload documents and begin the approval process.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><LoaderCircle className="spin" size={22} /> Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="empty-state"><FolderOpen size={24} /><strong>No projects available</strong><span>{emptyMessage ?? 'Projects will appear here when they are configured.'}</span></div>
      ) : (
        <div className="project-grid">
          {projects.map((project, index) => (
            <article className="project-card" key={project.id}>
              <div className="project-card-top">
                <div className={`project-avatar project-avatar-${index % 3}`} aria-hidden="true">{project.customer.slice(0, 1).toUpperCase()}</div>
                <span className="project-code">{project.id.toUpperCase()}</span>
              </div>
              <h2>{project.name}</h2>
              <p className="project-customer"><Building2 size={15} /> {project.customer}</p>
              <p className="project-description">{project.description}</p>
              <div className="project-meta-list">
                <div><UserRound size={15} /><span>Contact</span><strong>{project.customerContact}</strong></div>
                <div><Clock3 size={15} /><span>Workflow</span><strong>Approval required</strong></div>
              </div>
              <div className="project-card-footer">
                <span className="project-detail-label">Project details</span>
                <button type="button" className="button button-primary" disabled={!canStartWorkflow || busy} onClick={() => onStart(project)}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <>Start project <ArrowUpRight size={16} /></>}
                </button>
              </div>
              {!canStartWorkflow && <p className="field-hint">Switch to a requester account to start a project.</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
