import DashboardShell from '../components/DashboardShell';
import DisasterList from '../components/DisasterList';
import { useEffect, useState } from 'react';
import { fetchMyTeams, resignFromTeam } from '../utils/api';

export default function VolunteerDashboard() {
  const [activeTab, setActiveTab] = useState('memberships');
  const [teams, setTeams] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function refreshTeams() {
    try {
      const { teams: rows } = await fetchMyTeams();
      setTeams(rows);
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { refreshTeams(); }, []);

  async function resign(teamId) {
    if (!window.confirm('Resign from this team? You will become available for other teams.')) return;
    setMessage(''); setError('');
    try {
      await resignFromTeam(teamId);
      setMessage('You have resigned from the team.');
      await refreshTeams();
    } catch (err) { setError(err.message); }
  }

  const tabNav = (
    <nav className="tab-nav" role="tablist" aria-label="Volunteer sections">
      <button
        role="tab"
        aria-selected={activeTab === 'memberships'}
        aria-controls="panel-memberships"
        id="tab-memberships"
        className={`tab-btn ${activeTab === 'memberships' ? 'active' : ''}`}
        onClick={() => setActiveTab('memberships')}
      >
        <span className="tab-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </span>
        <span>Memberships</span>
      </button>
      <button
        role="tab"
        aria-selected={activeTab === 'disasters'}
        aria-controls="panel-disasters"
        id="tab-disasters"
        className={`tab-btn ${activeTab === 'disasters' ? 'active' : ''}`}
        onClick={() => setActiveTab('disasters')}
      >
        <span className="tab-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
        <span>Disasters</span>
      </button>
    </nav>
  );

  return (
    <DashboardShell
      layout="admin"
      heading={activeTab === 'memberships' ? 'Your team memberships' : 'Disaster register'}
      lead={activeTab === 'memberships'
        ? 'See your response teams. You may be in one team at a time; resign to join another.'
        : 'Stay aware of active incidents and their response locations.'}
      sidebar={tabNav}
    >
      <div
        key={activeTab}
        className="tab-content"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'memberships' && (
          <section className="module-section"><div className="section-heading"><div><div className="eyebrow">Team memberships</div><h2>Your teams</h2></div></div>
            {message && <div className="success-banner">{message}</div>}
            {error && <div className="error-banner">{error}</div>}
            {!teams.length ? <div className="empty-state">You are not assigned to a team yet.</div> : <div className="team-grid">{teams.map((team) => <div className="info-card" key={team.team_id}><h3>{team.team_name}</h3><p className="muted">{team.team_type} · led by {team.leader_name}</p><span className={`status-badge status-${team.status}`}>{team.status.replace('_', ' ')}</span><button className="btn-secondary" type="button" onClick={() => resign(team.team_id)}>Resign from team</button></div>)}</div>}
          </section>
        )}
        {activeTab === 'disasters' && <DisasterList />}
      </div>
    </DashboardShell>
  );
}
