import { useEffect, useState } from 'react';
import { fetchShelters, createShelter, updateShelter, deleteShelter } from '../../utils/api';
import { EMPTY_SHELTER } from './adminConstants';

export default function ShelterManagementTab() {
  const [form, setForm] = useState(EMPTY_SHELTER);
  const [shelters, setShelters] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function refreshShelters() {
    const { shelters: rows } = await fetchShelters();
    setShelters(rows);
  }

  useEffect(() => {
    refreshShelters().catch((err) => {
      setIsError(true);
      setMessage(err.message);
    });
  }, []);

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function startEdit(shelter) {
    setEditingId(shelter.shelter_id);
    setForm({
      name: shelter.name || '',
      address: shelter.address || '',
      capacity: shelter.capacity,
      division: shelter.division || '',
      district: shelter.district || '',
      upazila: shelter.upazila || '',
      union: shelter.union_name || '',
    });
    setMessage('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_SHELTER);
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    try {
      const result = editingId ? await updateShelter(editingId, form) : await createShelter(form);
      setIsError(false);
      setMessage(result.message || (editingId ? 'Shelter updated successfully.' : 'Shelter created successfully.'));
      resetForm();
      await refreshShelters();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  async function removeShelter(id) {
    if (!window.confirm('Delete this shelter?')) return;
    setMessage('');
    try {
      const result = await deleteShelter(id);
      setIsError(false);
      setMessage(result.message || 'Shelter deleted successfully.');
      if (editingId === id) resetForm();
      await refreshShelters();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  return (
    <>
      <div className="info-card module-card">
        <p className="eyebrow">{editingId ? 'Update shelter' : 'Register shelter'}</p>
        {message && <div className={isError ? 'error-banner' : 'success-banner'}>{message}</div>}
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field"><label>Shelter name</label><input required value={form.name} onChange={updateField('name')} placeholder="North Valley Shelter" /></div>
            <div className="field"><label>Capacity</label><input required type="number" min="1" value={form.capacity} onChange={updateField('capacity')} placeholder="250" /></div>
          </div>
          <div className="field"><label>Address</label><input value={form.address} onChange={updateField('address')} placeholder="Shelter address" /></div>
          <div className="form-grid">
            <div className="field"><label>Division</label><input required value={form.division} onChange={updateField('division')} placeholder="Sylhet" /></div>
            <div className="field"><label>District</label><input required value={form.district} onChange={updateField('district')} placeholder="Sunamganj" /></div>
            <div className="field"><label>Upazila</label><input value={form.upazila} onChange={updateField('upazila')} /></div>
            <div className="field"><label>Union</label><input value={form.union} onChange={updateField('union')} /></div>
          </div>
          <div className="button-row">
            <button type="submit" className="btn-primary">{editingId ? 'Update shelter' : 'Create shelter'}</button>
            {editingId && <button type="button" className="btn-ghost" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <section className="module-section">
        <div className="section-heading">
          <div><div className="eyebrow">Shelter registry</div><h2>Emergency shelters</h2></div>
          <span className="count-badge">{shelters.length} total</span>
        </div>
        {!shelters.length ? <div className="empty-state">No shelters have been registered yet.</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Shelter</th><th>Location</th><th>Address</th><th>Capacity</th><th>Actions</th></tr></thead>
              <tbody>
                {shelters.map((shelter) => (
                  <tr key={shelter.shelter_id}>
                    <td><strong>{shelter.name}</strong><small>#{shelter.shelter_id}</small></td>
                    <td>{[shelter.district, shelter.upazila, shelter.union_name].filter(Boolean).join(' / ')}</td>
                    <td>{shelter.address || '—'}</td>
                    <td>{shelter.capacity}</td>
                    <td><div className="button-row"><button className="btn-ghost" onClick={() => startEdit(shelter)}>Edit</button><button className="btn-danger" onClick={() => removeShelter(shelter.shelter_id)}>Delete</button></div></td>
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
