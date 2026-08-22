import { useEffect, useState, useRef } from 'react';
import DashboardShell from '../components/DashboardShell';
import DisasterList from '../components/DisasterList';
import { createDisaster, fetchPendingTeams, fetchAllTeams, reviewTeam } from '../utils/api';

const TEAM_STATUSES = ['all', 'pending_approval', 'approved', 'rejected', 'disbanded'];

function statusLabel(status) {
  return String(status || '').replace('_', ' ');
}

const DisasterTab = ({ refreshKey }) => {
  const [form, setForm] = useState({ title: '', division: '', district: '', upazila: '', union: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await createDisaster(form);
      setIsError(false);
      setMessage(res.message || 'Disaster created successfully!');
      setForm({ title: '', division: '', district: '', upazila: '', union: '' });
      refreshKey.current++;
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  };

  return (
    <>
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
      <DisasterList canEdit refreshKey={refreshKey.current} />
    </>
  );
};

const TeamTab = () => {
  const [pendingTeams, setPendingTeams] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewRemarks, setReviewRemarks] = useState({});
  const [reviewError, setReviewError] = useState('');

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
    const remark = String(reviewRemarks[teamId] || '').trim();
    if (action === 'reject' && !remark) {
      setReviewError('Please provide a reason before rejecting a team.');
      return;
    }
    setReviewError('');
    try {
      await reviewTeam(teamId, action, remark);
      setPendingTeams((rows) => rows.filter((row) => row.team_id !== teamId));
      setReviewRemarks((rows) => {
        const next = { ...rows };
        delete next[teamId];
        return next;
      });
      await refreshAllTeams();
    } catch (err) {
      setReviewError(err.message);
    }
  }

  const visibleTeams = statusFilter === 'all'
    ? allTeams
    : allTeams.filter((team) => String(team.status).toLowerCase() === statusFilter);

  return (
    <>
      <section className="module-section">
        <div className="section-heading">
          <div><div className="eyebrow">Approval queue</div><h2>Pending teams</h2></div>
          <span className="count-badge">{pendingTeams.length} waiting</span>
        </div>
        {reviewError && <div className="error-banner">{reviewError}</div>}
        {!pendingTeams.length ? <div className="empty-state">No teams are waiting for review.</div> : (
          <div className="team-grid">
            {pendingTeams.map((team) => (
              <div className="info-card" key={team.team_id}>
                <div className="eyebrow">{team.team_type}</div>
                <h3>{team.team_name}</h3>
                <p className="muted">Led by {team.leader_name || 'Unknown'} · {team.members.length} members</p>
                <div className="member-list">{team.members.map((member) => <span key={member.user_id}>{member.name} · {member.role}</span>)}</div>
                <div className="field">
                  <label htmlFor={`review-remark-${team.team_id}`}>Review remark</label>
                  <textarea
                    id={`review-remark-${team.team_id}`}
                    rows="3"
                    value={reviewRemarks[team.team_id] || ''}
                    onChange={(event) => setReviewRemarks((rows) => ({ ...rows, [team.team_id]: event.target.value }))}
                    placeholder="Explain the approval or rejection decision"
                  />
                </div>
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
                <tr><th>Team</th><th>Type</th><th>Leader</th><th>Status</th><th>Members</th><th>Review remark</th></tr>
              </thead>
              <tbody>
                {visibleTeams.map((team) => (
                  <tr key={team.team_id}>
                    <td><strong>{team.team_name}</strong><small>#{team.team_id}</small></td>
                    <td>{team.team_type}</td>
                    <td>{team.leader_name || '—'}</td>
                    <td><span className={`status-badge status-${String(team.status).toLowerCase()}`}>{statusLabel(team.status)}</span></td>
                    <td>{team.members.length ? team.members.map((member) => member.name).join(', ') : '—'}</td>
                    <td>{team.review_remark || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('disaster');
  const refreshKey = useRef(0);

  const tabs = [
    { id: 'disaster', label: 'Disasters', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    )},
    { id: 'team', label: 'Teams', icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )}
  ];

  const tabNav = (
    <nav className="tab-nav" role="tablist" aria-label="Admin sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          id={`tab-${tab.id}`}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <DashboardShell
      layout="admin"
      eyebrow="Admin console"
      heading="Operations overview"
      lead="Manage disaster records, locations, and relief operations."
      sidebar={tabNav}
    >
      <div
        key={activeTab}
        className="tab-content"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'disaster' && <DisasterTab refreshKey={refreshKey} />}
        {activeTab === 'team' && <TeamTab />}
      </div>
    </DashboardShell>
  );
}
