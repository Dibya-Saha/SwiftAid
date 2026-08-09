import { useEffect, useState } from 'react';
import DashboardShell from '../components/DashboardShell';
import DisasterList from '../components/DisasterList';
import { createTeam, fetchMyTeams, fetchVolunteers, disbandTeam } from '../utils/api';
import { getUser } from '../utils/auth';

function statusLabel(status) {
  return String(status || '').replace('_', ' ');
}

function TeamMembershipCard({ team, currentUserId, onDisband, index }) {
  const status = String(team.status).toLowerCase();
  const isDisbanded = status === 'disbanded';
  const isRejected = status === 'rejected';
  const isInactive = isDisbanded || isRejected;
  const isLeader = team.leader_id === currentUserId;

  return (
    <article
      className={`team-card info-card ${isInactive ? 'team-card--inactive' : ''}`}
      style={{ '--i': index }}
    >
      <div className="team-card__header">
        <span className="eyebrow">{team.team_type}</span>
        <span className={`status-badge status-${status}`}>{statusLabel(team.status)}</span>
      </div>
      <h3>{team.team_name}</h3>

      {isInactive ? (
        <p className="muted team-card__note">
          {isRejected
            ? 'This team was rejected. All members were released.'
            : 'This team has been disbanded. All members were released.'}
        </p>
      ) : (
        <>
          <div className="team-card__meta">
            <span>{team.members.length} member{team.members.length !== 1 ? 's' : ''}</span>
            {isLeader && <span className="team-card__role">Team leader</span>}
          </div>
          <div className="member-list">
            {team.members.map((member) => (
              <span key={member.user_id} className="member-chip">
                {member.name} · {member.role}
              </span>
            ))}
          </div>
          {isLeader && (
            <button className="btn-danger" type="button" onClick={() => onDisband(team.team_id)}>
              Disband team
            </button>
          )}
        </>
      )}
    </article>
  );
}

function RegisterTab({ form, setForm, volunteers, selected, toggleVolunteer, submit, message, error, isInTeam }) {
  return (
    <div className="info-card module-card team-form-card">
      <div className="eyebrow">New response unit</div>
      <h2>Register a team</h2>

      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-banner">{error}</div>}

      {isInTeam ? (
        <div className="empty-state">You already belong to a team. Disband your current team before creating a new one.</div>
      ) : (
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label>Team name</label>
              <input
                required
                value={form.team_name}
                onChange={(e) => setForm({ ...form, team_name: e.target.value })}
                placeholder="North Valley Response"
              />
            </div>
            <div className="field">
              <label>Team type</label>
              <select
                value={form.team_type}
                onChange={(e) => setForm({ ...form, team_type: e.target.value })}
              >
                {['medical', 'rescue', 'logistics', 'distribution', 'general'].map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="field-label">
            Available volunteers
            {selected.length > 0 && (
              <span className="selection-count">{selected.length} selected</span>
            )}
          </label>
          <div className="checkbox-list team-volunteer-list">
            {volunteers.length ? (
              volunteers.map((volunteer) => {
                const isSelected = selected.includes(volunteer.user_id);
                return (
                  <label
                    className={`checkbox-row ${isSelected ? 'checkbox-row--selected' : ''}`}
                    key={volunteer.user_id}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleVolunteer(volunteer.user_id)}
                    />
                    <span>
                      {volunteer.full_name}
                      <small>{volunteer.email}</small>
                    </span>
                  </label>
                );
              })
            ) : (
              <span className="muted team-volunteer-empty">No unassigned volunteers available.</span>
            )}
          </div>
          <button className="btn-primary team-submit" type="submit">
            Submit for approval
          </button>
        </form>
      )}
    </div>
  );
}

function MembershipsTab({ teams, currentUserId, onDisband }) {
  return (
    <>
      <div className="section-heading">
        <div>
          <div className="eyebrow">My teams</div>
          <h2>Memberships</h2>
        </div>
        <span className="count-badge">{teams.length} total</span>
      </div>

      {!teams.length ? (
        <div className="empty-state">You are not part of a team yet.</div>
      ) : (
        <div className="team-grid team-grid--cards">
          {teams.map((team, index) => (
            <TeamMembershipCard
              key={team.team_id}
              team={team}
              currentUserId={currentUserId}
              onDisband={onDisband}
              index={index}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function TeamDashboard() {
  const [activeTab, setActiveTab] = useState('register');
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

  const isInTeam = teams.some((team) => {
    const status = String(team.status).toLowerCase();
    return status !== 'disbanded' && status !== 'rejected';
  });

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await createTeam({ ...form, volunteer_ids: selected });
      setMessage('Team submitted for admin approval.');
      setForm({ team_name: '', team_type: 'general' });
      setSelected([]);
      await refresh();
      setActiveTab('memberships');
    } catch (err) {
      setError(err.message);
    }
  }

  async function disband(teamId) {
    if (!window.confirm('Disband this team? All members will be released and become available again.')) return;
    setMessage('');
    setError('');
    try {
      await disbandTeam(teamId);
      setMessage('Team disbanded.');
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleVolunteer(id) {
    setSelected((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  const tabs = [
    {
      id: 'register',
      label: 'Register team',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      ),
    },
    {
      id: 'memberships',
      label: 'Memberships',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'disasters',
      label: 'Disasters',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  ];

  const tabNav = (
    <nav className="tab-nav" role="tablist" aria-label="Team sections">
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
      hideHeader
      eyebrow="Team console"
      sidebar={tabNav}
    >
      <div
        key={activeTab}
        className="tab-content"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab !== 'register' && message && <div className="success-banner">{message}</div>}
        {activeTab !== 'register' && error && <div className="error-banner">{error}</div>}

        {activeTab === 'register' && (
          <RegisterTab
            form={form}
            setForm={setForm}
            volunteers={volunteers}
            selected={selected}
            toggleVolunteer={toggleVolunteer}
            submit={submit}
            message={message}
            error={error}
            isInTeam={isInTeam}
          />
        )}
        {activeTab === 'memberships' && (
          <MembershipsTab teams={teams} currentUserId={currentUserId} onDisband={disband} />
        )}
        {activeTab === 'disasters' && <DisasterList />}
      </div>
    </DashboardShell>
  );
}
