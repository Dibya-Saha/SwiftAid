import { useEffect, useState } from 'react';
import DashboardShell from '../components/DashboardShell';
import DisasterList from '../components/DisasterList';
import { createDisaster, fetchPendingTeams, fetchAllTeams, reviewTeam } from '../utils/api';

const TEAM_STATUSES = ['all', 'pending_approval', 'approved', 'rejected', 'disbanded'];

function statusLabel(status) {
  return String(status || '').replace('_', ' ');
}

export default function AdminDashboard() {
  const [form, setForm] = useState({ title: '', division: '', district: '', upazila: '', union: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingTeams, setPendingTeams] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  async function refreshAllTeams() {
    try {
      const { teams } = await fetchAllTeams();
      setAllTeams(teams);
    } catch { /* registry is secondary to pending review */ }
  }

  useEffect(() => {
    fetchPendingTeams().then(({ teams }) => setPendingTeams(teams)).catch(() => {});
    refreshAllTeams();
  }, []);

  async function handleReview(teamId, action) {
    try {
      await reviewTeam(teamId, action);
      setPendingTeams((rows) => rows.filter((row) => row.team_id !== teamId));
      await refreshAllTeams();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await createDisaster(form);
      setIsError(false);
      setMessage(res.message || 'Disaster created successfully!');
       setForm({ title: '', division: '', district: '', upazila: '', union: '' });
       setRefreshKey((key) => key + 1);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  };

  const visibleTeams = statusFilter === 'all'
    ? allTeams
    : allTeams.filter((team) => String(team.status).toLowerCase() === statusFilter);

  return (
    <DashboardShell
      eyebrow="Admin console"
      heading="Operations overview"
      lead="Manage disaster records, locations, and relief operations."
    >
      <div className="info-card module-card">
        <p className="eyebrow">Create New Disaster</p>

        {message && (
          <div className={isError ? 'error-banner' : 'success-banner'}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Disaster Title</label>
            <input
              placeholder="e.g. Sylhet Flood 2024"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Upazila</label>
              <input value={form.upazila} onChange={(e) => setForm({ ...form, upazila: e.target.value })} />
            </div>
            <div className="field">
              <label>Union</label>
              <input value={form.union} onChange={(e) => setForm({ ...form, union: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Division</label>
            <input
              placeholder="e.g. Sylhet"
              value={form.division}
              onChange={e => setForm({ ...form, division: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>District</label>
            <input
              placeholder="e.g. Sunamganj"
              value={form.district}
              onChange={e => setForm({ ...form, district: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            Create Disaster
          </button>
        </form>
      </div>
      <DisasterList canEdit refreshKey={refreshKey} />

      <section className="module-section">
        <div className="section-heading">
          <div><div className="eyebrow">Approval queue</div><h2>Pending teams</h2></div>
          <span className="count-badge">{pendingTeams.length} waiting</span>
        </div>
        {!pendingTeams.length ? <div className="empty-state">No teams are waiting for review.</div> : (
          <div className="team-grid">
            {pendingTeams.map((team) => (
              <div className="info-card" key={team.team_id}>
                <div className="eyebrow">{team.team_type}</div>
                <h3>{team.team_name}</h3>
                <p className="muted">Led by {team.leader_name || 'Unknown'} · {team.members.length} members</p>
                <div className="member-list">{team.members.map((member) => <span key={member.user_id}>{member.name} · {member.role}</span>)}</div>
                <div className="button-row">
                  <button className="btn-primary compact" onClick={() => handleReview(team.team_id, 'approve')}>Approve</button>
                  <button className="btn-ghost" onClick={() => handleReview(team.team_id, 'reject')}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="module-section">
        <div className="section-heading">
          <div><div className="eyebrow">Team registry</div><h2>All teams</h2></div>
          <select className="status-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {TEAM_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
        </div>
        {!visibleTeams.length ? <div className="empty-state">No teams match this filter.</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Team</th><th>Type</th><th>Leader</th><th>Status</th><th>Members</th></tr>
              </thead>
              <tbody>
                {visibleTeams.map((team) => (
                  <tr key={team.team_id}>
                    <td><strong>{team.team_name}</strong><small>#{team.team_id}</small></td>
                    <td>{team.team_type}</td>
                    <td>{team.leader_name || '—'}</td>
                    <td><span className={`status-badge status-${String(team.status).toLowerCase()}`}>{statusLabel(team.status)}</span></td>
                    <td>{team.members.length ? team.members.map((member) => member.name).join(', ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
