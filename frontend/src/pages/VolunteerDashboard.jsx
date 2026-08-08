import DashboardShell from '../components/DashboardShell';
import DisasterList from '../components/DisasterList';
import { useEffect, useState } from 'react';
import { fetchMyTeams, resignFromTeam } from '../utils/api';

export default function VolunteerDashboard() {
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

  return (
    <DashboardShell
      eyebrow="Volunteer portal"
      heading="Your team memberships"
      lead="See your response teams. You may be in one team at a time; resign to join another."
    >
      <section className="module-section"><div className="section-heading"><div><div className="eyebrow">Team memberships</div><h2>Your teams</h2></div></div>
        {message && <div className="success-banner">{message}</div>}
        {error && <div className="error-banner">{error}</div>}
        {!teams.length ? <div className="empty-state">You are not assigned to a team yet.</div> : <div className="team-grid">{teams.map((team) => <div className="info-card" key={team.team_id}><h3>{team.team_name}</h3><p className="muted">{team.team_type} · led by {team.leader_name}</p><span className={`status-badge status-${team.status}`}>{team.status.replace('_', ' ')}</span><button className="btn-secondary" type="button" onClick={() => resign(team.team_id)}>Resign from team</button></div>)}</div>}
      </section>
      <DisasterList />
    </DashboardShell>
  );
}
