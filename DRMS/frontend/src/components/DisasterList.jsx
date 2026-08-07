import { useEffect, useState } from 'react';
import { fetchDisasters, updateDisasterStatus } from '../utils/api';

const STATUSES = ['ACTIVE', 'ONGOING', 'RESOLVED', 'CLOSED'];

function locationLabel(locations = []) {
  return locations
    .map((location) => [location.district, location.upazila, location.union_name].filter(Boolean).join(' / '))
    .join(', ');
}

export default function DisasterList({ canEdit = false, refreshKey = 0 }) {
  const [disasters, setDisasters] = useState([]);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    let active = true;
    fetchDisasters()
      .then(({ disasters: rows }) => active && setDisasters(rows))
      .catch((err) => active && setError(err.message));
    return () => { active = false; };
  }, [refreshKey]);

  async function changeStatus(id, status) {
    setUpdating(id);
    setError('');
    try {
      const { disaster } = await updateDisasterStatus(id, status);
      setDisasters((rows) => rows.map((row) => row.disaster_id === id ? { ...row, ...disaster } : row));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <section className="module-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Incident register</div>
          <h2>Disasters</h2>
        </div>
        <span className="count-badge">{disasters.length} records</span>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {!disasters.length && !error ? (
        <div className="empty-state">No disasters have been registered yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Incident</th><th>Location</th><th>Started</th><th>Status</th></tr>
            </thead>
            <tbody>
              {disasters.map((disaster) => (
                <tr key={disaster.disaster_id}>
                  <td><strong>{disaster.title}</strong><small>#{disaster.disaster_id}</small></td>
                  <td>{locationLabel(disaster.locations) || 'Location pending'}</td>
                  <td>{new Date(disaster.start_date).toLocaleDateString()}</td>
                  <td>
                    {canEdit ? (
                      <select
                        className="status-select"
                        value={disaster.status}
                        disabled={updating === disaster.disaster_id}
                        onChange={(event) => changeStatus(disaster.disaster_id, event.target.value)}
                      >
                        {STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    ) : <span className={`status-badge status-${String(disaster.status).toLowerCase()}`}>{disaster.status}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
