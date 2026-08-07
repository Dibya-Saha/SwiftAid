import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMe } from '../utils/api';
import { clearSession, getUser } from '../utils/auth';

// One shell, reused by all four roles. Each dashboard page just passes
// its own eyebrow/heading/lead copy and (later) its own widgets as children.
export default function DashboardShell({ eyebrow, heading, lead, children }) {
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

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div className="brand-mark">DRMS</div>
        <div className="topbar-right">
          <span className="role-pill">{profile?.role}</span>
          <button className="btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

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
