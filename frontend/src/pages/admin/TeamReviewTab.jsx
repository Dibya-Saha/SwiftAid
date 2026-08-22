import { useEffect, useState } from 'react';
import Select from '../../components/Select';
import { fetchPendingTeams, fetchAllTeams, reviewTeam } from '../../utils/api';
import { TEAM_STATUSES, statusLabel } from './adminConstants';

export default function TeamReviewTab() {
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

  const visibleTeams = statusFilter === 'all' ? allTeams : allTeams.filter((team) => String(team.status).toLowerCase() === statusFilter);

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
                  <textarea id={`review-remark-${team.team_id}`} rows="3" value={reviewRemarks[team.team_id] || ''} onChange={(event) => setReviewRemarks((rows) => ({ ...rows, [team.team_id]: event.target.value }))} placeholder="Explain the approval or rejection decision" />
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
          <Select variant="pill" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} options={TEAM_STATUSES.map((status) => ({ value: status, label: statusLabel(status) }))} />
        </div>
        {!visibleTeams.length ? <div className="empty-state">No teams match this filter.</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Team</th><th>Type</th><th>Leader</th><th>Status</th><th>Members</th><th>Review remark</th></tr></thead>
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
}
