import { useEffect, useState } from 'react';
import DashboardShell from '../components/DashboardShell';
import DisasterList from '../components/DisasterList';
import { createTeam, fetchMyTeams, fetchVolunteers, disbandTeam } from '../utils/api';
import { getUser } from '../utils/auth';

export default function TeamDashboard() {
  const [form, setForm] = useState({ team_name: '', team_type: 'general' });
  const [volunteers, setVolunteers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [teams, setTeams] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const currentUserId = Number(getUser()?.user_id);

  async function refresh() {
    const [volunteerData, teamData] = await Promise.all([fetchVolunteers(), fetchMyTeams()]);
    setVolunteers(volunteerData.volunteers);
    setTeams(teamData.teams);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, []);

  const isInTeam = teams.some((team) => String(team.status).toLowerCase() !== 'disbanded');

  async function submit(event) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      await createTeam({ ...form, volunteer_ids: selected });
      setMessage('Team submitted for admin approval.');
      setForm({ team_name: '', team_type: 'general' }); setSelected([]);
      await refresh();
    } catch (err) { setError(err.message); }
  }

  async function disband(teamId) {
    if (!window.confirm('Disband this team? All members will be released and become available again.')) return;
    setMessage(''); setError('');
    try {
      await disbandTeam(teamId);
      setMessage('Team disbanded.');
      await refresh();
    } catch (err) { setError(err.message); }
  }

  function toggleVolunteer(id) {
    setSelected((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  return (
    <DashboardShell
      eyebrow="Team console"
      heading="Assigned distributions"
      lead="Build a response team, request approval, and coordinate relief operations."
    >
      <div className="module-layout">
        <div className="info-card module-card">
          <div className="eyebrow">New response unit</div><h2>Register a team</h2>
          {message && <div className="success-banner">{message}</div>}
          {error && <div className="error-banner">{error}</div>}
          {isInTeam ? <div className="empty-state">You already belong to a team. Disband your current team before creating a new one.</div> : (
          <form onSubmit={submit}>
            <div className="field"><label>Team name</label><input required value={form.team_name} onChange={(e) => setForm({ ...form, team_name: e.target.value })} placeholder="North Valley Response" /></div>
            <div className="field"><label>Team type</label><select value={form.team_type} onChange={(e) => setForm({ ...form, team_type: e.target.value })}>{['medical', 'rescue', 'logistics', 'distribution', 'general'].map((type) => <option key={type}>{type}</option>)}</select></div>
            <label className="field-label">Available volunteers</label>
            <div className="checkbox-list">{volunteers.length ? volunteers.map((volunteer) => <label className="checkbox-row" key={volunteer.user_id}><input type="checkbox" checked={selected.includes(volunteer.user_id)} onChange={() => toggleVolunteer(volunteer.user_id)} /><span>{volunteer.full_name}<small>{volunteer.email}</small></span></label>) : <span className="muted">No unassigned volunteers available.</span>}</div>
            <button className="btn-primary" type="submit">Submit for approval</button>
          </form>)}
        </div>
        <div className="module-section compact-section"><div className="section-heading"><div><div className="eyebrow">My teams</div><h2>Memberships</h2></div></div>{!teams.length ? <div className="empty-state">You are not part of a team yet.</div> : <div className="team-grid">{teams.map((team) => { const isDisbanded = String(team.status).toLowerCase() === 'disbanded'; return <div className="info-card" key={team.team_id}><div className="eyebrow">{team.team_type}</div><h3>{team.team_name}</h3><span className={`status-badge status-${String(team.status).toLowerCase()}`}>{team.status.replace('_', ' ')}</span>{isDisbanded ? <p className="muted">This team has been disbanded. All members were released.</p> : <div className="member-list">{team.members.map((member) => <span key={member.user_id}>{member.name} · {member.role}</span>)}</div>}{!isDisbanded && team.leader_id === currentUserId && <button className="btn-danger" type="button" onClick={() => disband(team.team_id)}>Disband team</button>}</div>; })}</div>}</div>
      </div>
      <DisasterList />
    </DashboardShell>
  );
}
