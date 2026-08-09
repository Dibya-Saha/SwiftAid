import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMe } from '../utils/api';
import { clearSession, getUser } from '../utils/auth';

// One shell, reused by all four roles. Each dashboard page just passes
// its own eyebrow/heading/lead copy and (later) its own widgets as children.
export default function DashboardShell({
  eyebrow,
  heading,
  lead,
  children,
  layout = 'default',
  sidebar = null,
}) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getUser());
  const [error, setError] = useState('');

  useEffect(() => {
    // Confirms the round trip: token -> API -> Postgres -> back to the UI.
    fetchMe()
      .then(({ user }) => setProfile(user))
      .catch(() => setError('Could not refresh profile from the server.'));
  }, []);

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  const topbar = (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand-mark">DRMS</div>
        {layout === 'admin' && (
          <span className="topbar-context">{eyebrow}</span>
        )}
      </div>
      <div className="topbar-right">
        {layout === 'admin' && (
          <span className="topbar-user">{profile?.full_name || profile?.email}</span>
        )}
        <span className="role-pill">{profile?.role}</span>
        <button className="btn-ghost" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );

  if (layout === 'admin') {
    return (
      <div className="dashboard-shell dashboard-shell--admin">
        {topbar}
        <div className="admin-layout">
          <aside className="admin-sidebar">
            <div className="admin-sidebar__label">Sections</div>
            {sidebar}
          </aside>
          <main className="admin-main">
            <header className="admin-page-header">
              <h1>{heading}</h1>
              <p className="lead">{lead}</p>
              {error && <div className="error-banner">{error}</div>}
            </header>
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      {topbar}
      <main className="dashboard-content">
        <div className="brand-mark">{eyebrow}</div>
        <h1>{heading}</h1>
        <p className="lead">{lead}</p>

        {error && <div className="error-banner">{error}</div>}

        <div className="card-grid">
          <div className="info-card">
            <div className="eyebrow">Signed in as</div>
            <div className="value">{profile?.full_name || '—'}</div>
          </div>
          <div className="info-card">
            <div className="eyebrow">Email</div>
            <div className="value">{profile?.email || '—'}</div>
          </div>
          <div className="info-card">
            <div className="eyebrow">Role</div>
            <div className="value">{profile?.role || '—'}</div>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
