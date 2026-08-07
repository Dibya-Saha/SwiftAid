import { useState } from 'react';
import DashboardShell from '../components/DashboardShell';
import { createDisaster } from '../utils/api';

export default function AdminDashboard() {
  const [form, setForm] = useState({ title: '', division: '', district: '' });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await createDisaster(form);
      setIsError(false);
      setMessage(res.message || 'Disaster created successfully!');
      setForm({ title: '', division: '', district: '' });
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  };

  return (
    <DashboardShell
      eyebrow="Admin console"
      heading="Operations overview"
      lead="Manage disaster records, locations, and relief operations."
    >
      <div className="info-card" style={{ maxWidth: '420px' }}>
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
    </DashboardShell>
  );
}
