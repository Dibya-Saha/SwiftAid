import { useEffect, useState } from 'react';
import Select from '../../components/Select';
import { fetchVictims, createVictim, updateVictim, deleteVictim, fetchDisasters, fetchShelters } from '../../utils/api';
import { EMPTY_VICTIM } from './adminConstants';

export default function VictimManagementTab() {
  const [form, setForm] = useState(EMPTY_VICTIM);
  const [victims, setVictims] = useState([]);
  const [disasters, setDisasters] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function refresh() {
    const [{ victims: victimRows }, { disasters: disasterRows }, { shelters: shelterRows }] = await Promise.all([
      fetchVictims(), fetchDisasters(), fetchShelters(),
    ]);
    setVictims(victimRows);
    setDisasters(disasterRows);
    setShelters(shelterRows);
  }

  useEffect(() => {
    refresh().catch((err) => {
      setIsError(true);
      setMessage(err.message);
    });
  }, []);

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function startEdit(victim) {
    setEditingId(victim.victim_id);
    setForm({
      full_name: victim.full_name || '',
      date_of_birth: victim.date_of_birth ? String(victim.date_of_birth).slice(0, 10) : '',
      gender: victim.gender || '',
      priority_level: victim.priority_level || 'normal',
      status: victim.status || 'registered',
      disaster_id: victim.disaster_id,
      shelter_id: victim.shelter_id || '',
    });
    setMessage('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_VICTIM);
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    try {
      const payload = { ...form, shelter_id: form.shelter_id || null };
      const result = editingId ? await updateVictim(editingId, payload) : await createVictim(payload);
      setIsError(false);
      setMessage(result.message || (editingId ? 'Victim updated successfully.' : 'Victim registered successfully.'));
      resetForm();
      await refresh();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  async function removeVictim(id) {
    if (!window.confirm('Delete this victim record?')) return;
    setMessage('');
    try {
      const result = await deleteVictim(id);
      setIsError(false);
      setMessage(result.message || 'Victim deleted successfully.');
      if (editingId === id) resetForm();
      await refresh();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  return (
    <>
      <div className="info-card module-card">
        <p className="eyebrow">{editingId ? 'Update victim' : 'Register victim'}</p>
        {message && <div className={isError ? 'error-banner' : 'success-banner'}>{message}</div>}
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field"><label>Full name</label><input required value={form.full_name} onChange={updateField('full_name')} /></div>
            <div className="field"><label>Date of birth</label><input type="date" value={form.date_of_birth} onChange={updateField('date_of_birth')} /></div>
          </div>
          <div className="form-grid">
            <div className="field"><label>Gender</label><input value={form.gender} onChange={updateField('gender')} placeholder="Female" /></div>
            <div className="field"><label>Priority</label><Select value={form.priority_level} onChange={updateField('priority_level')} options={[{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]} /></div>
          </div>
          <div className="form-grid">
            <div className="field"><label>Status</label><Select value={form.status} onChange={updateField('status')} options={[{ value: 'registered', label: 'Registered' }, { value: 'relocated', label: 'Relocated' }]} /></div>
            <div className="field"><label>Disaster</label><Select required value={form.disaster_id} onChange={updateField('disaster_id')} placeholder="Select disaster" options={[{ value: '', label: 'Select disaster' }, ...disasters.map((disaster) => ({ value: disaster.disaster_id, label: disaster.title }))]} /></div>
          </div>
          <div className="field"><label>Shelter (optional)</label><Select value={form.shelter_id} onChange={updateField('shelter_id')} placeholder="Unassigned" options={[{ value: '', label: 'Unassigned' }, ...shelters.map((shelter) => ({ value: shelter.shelter_id, label: `${shelter.name} (${shelter.capacity} capacity)` }))]} /></div>
          <div className="button-row"><button type="submit" className="btn-primary">{editingId ? 'Update victim' : 'Register victim'}</button>{editingId && <button type="button" className="btn-ghost" onClick={resetForm}>Cancel</button>}</div>
        </form>
      </div>
      <section className="module-section">
        <div className="section-heading"><div><div className="eyebrow">Victim registry</div><h2>Affected people</h2></div><span className="count-badge">{victims.length} total</span></div>
        {!victims.length ? <div className="empty-state">No victim records have been registered yet.</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Victim</th><th>Disaster</th><th>Shelter</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody>{victims.map((victim) => <tr key={victim.victim_id}><td><strong>{victim.full_name}</strong><small>#{victim.victim_id}</small></td><td>{victim.disaster_title}</td><td>{victim.shelter_name || 'Unassigned'}</td><td>{victim.priority_level}</td><td><span className={`status-badge status-${victim.status}`}>{victim.status}</span></td><td><div className="button-row"><button className="btn-ghost" onClick={() => startEdit(victim)}>Edit</button><button className="btn-danger" onClick={() => removeVictim(victim.victim_id)}>Delete</button></div></td></tr>)}</tbody></table></div>}
      </section>
    </>
  );
}
