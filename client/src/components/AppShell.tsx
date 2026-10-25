import { FileCheck2, FolderOpen, LogOut, Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PortalUser } from '../types';

type AppPage = 'projects' | 'workflows';

interface AppShellProps {
  children: ReactNode;
  page: AppPage;
  user: PortalUser;
  workflowCount: number;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
}

export function AppShell({ children, page, user, workflowCount, onNavigate, onLogout }: AppShellProps) {
  const workflowLabel = user.role === 'approver' ? 'Approval queue' : 'My workflows';

  return (
    <div className="app-layout">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand-lockup">
          <span className="brand-icon"><FileCheck2 size={21} /></span>
          <span className="brand-copy"><strong>SignFlow</strong><small>Project approvals</small></span>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="primary-nav">
          {user.role === 'requester' && (
            <button className={`nav-link ${page === 'projects' ? 'is-active' : ''}`} onClick={() => onNavigate('projects')}>
              <FolderOpen size={18} /> <span>Projects</span>
            </button>
          )}
          {user.role === 'approver' && (
            <button className={`nav-link ${page === 'workflows' ? 'is-active' : ''}`} onClick={() => onNavigate('workflows')}>
              <Mail size={18} /> <span>{workflowLabel}</span>
              <span className="nav-count">{workflowCount}</span>
            </button>
          )}
        </nav>
        <div className="sidebar-footnote">Approval Portal</div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{page === 'projects' ? 'Projects' : workflowLabel}</strong></div>
          <div className="account-select">
            <span className="account-avatar" aria-hidden="true">{user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
            <span className="account-label"><small>Account</small><strong>{user.name}</strong></span>
            <button type="button" className="button button-secondary logout-button" onClick={onLogout}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
