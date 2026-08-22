import { useState } from 'react';
import DisasterList from '../../components/DisasterList';
import { createDisaster } from '../../utils/api';

export default function DisasterManagementTab({ refreshKey }) {
  const [form, setForm] = useState({ title: '', division: '', district: '', upazila: '', union: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
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
  }

  return (
    <>
      <div className="info-card module-card">
        <p className="eyebrow">Create New Disaster</p>
        {message && <div className={isError ? 'error-banner' : 'success-banner'}>{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Disaster Title</label>
            <input placeholder="e.g. Sylhet Flood 2024" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="form-grid">
            <div className="field"><label>Upazila</label><input value={form.upazila} onChange={(e) => setForm({ ...form, upazila: e.target.value })} /></div>
            <div className="field"><label>Union</label><input value={form.union} onChange={(e) => setForm({ ...form, union: e.target.value })} /></div>
          </div>
          <div className="field"><label>Division</label><input placeholder="e.g. Sylhet" value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} required /></div>
          <div className="field"><label>District</label><input placeholder="e.g. Sunamganj" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} required /></div>
          <button type="submit" className="btn-primary">Create Disaster</button>
        </form>
      </div>
      <DisasterList canEdit refreshKey={refreshKey.current} />
    </>
  );
}
