import DashboardShell from '../components/DashboardShell';
import DisasterList from '../components/DisasterList';
import { useEffect, useState } from 'react';
import { fetchMyTeams } from '../utils/api';

export default function VolunteerDashboard() {
  const [teams, setTeams] = useState([]);
  useEffect(() => { fetchMyTeams().then(({ teams: rows }) => setTeams(rows)).catch(() => {}); }, []);
  return (
    <DashboardShell
      eyebrow="Volunteer portal"
      heading="Your team memberships"
      lead="See your approved response teams and the active incidents they can support."
    >
      <section className="module-section"><div className="section-heading"><div><div className="eyebrow">Team memberships</div><h2>Your teams</h2></div></div>{!teams.length ? <div className="empty-state">You are not assigned to a team yet.</div> : <div className="team-grid">{teams.map((team) => <div className="info-card" key={team.team_id}><h3>{team.team_name}</h3><p className="muted">{team.team_type} · led by {team.leader_name}</p><span className={`status-badge status-${team.status}`}>{team.status.replace('_', ' ')}</span></div>)}</div>}</section>
      <DisasterList />
    </DashboardShell>
  );
}
