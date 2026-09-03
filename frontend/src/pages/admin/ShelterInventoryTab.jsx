import { useEffect, useState } from 'react';
import { fetchShelterInventory, fetchShelters } from '../../utils/api';
import Select from '../../components/Select';

export default function ShelterInventoryTab() {
  const [grouped, setGrouped] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [invRes, shRes] = await Promise.all([fetchShelterInventory(), fetchShelters()]);
      setGrouped(invRes.grouped || []);
      setShelters(shRes.shelters || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="empty-state">Loading shelter inventory...</div>;
  if (error) return <div className="error-banner">{error}</div>;

  const filtered = selected ? grouped.filter((g) => String(g.shelter_id) === String(selected)) : grouped;

  return (
    <>
      <div className="info-card module-card" style={{ marginBottom: 16 }}>
        <p className="eyebrow">Shelter inventory</p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>View supplies donated to each shelter via relief requests. Inventory is independent per shelter.</p>
        <div style={{ marginTop: 12, maxWidth: 300 }}>
          <Select value={selected} onChange={(e) => setSelected(e.target.value)} placeholder="All shelters" options={[{ value: '', label: 'All shelters' }, ...shelters.map((s) => ({ value: String(s.shelter_id), label: s.name }))]} />
        </div>
      </div>
      {!filtered.length ? <div className="empty-state">No shelter inventory yet. Donations via relief requests will appear here.</div> : filtered.map((g) => (
        <section key={g.shelter_id} className="module-section" style={{ marginTop: 20 }}>
          <div className="section-heading"><h2>{g.shelter_name}</h2><span className="count-badge">{g.items.length} items</span></div>
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Item</th><th>Category</th><th>Quantity</th><th>Unit</th></tr></thead><tbody>{g.items.map((it) => <tr key={it.shelter_inventory_id}><td><strong>{it.item_name}</strong><small>#{it.item_id}</small></td><td>{it.category || '—'}</td><td>{it.quantity}</td><td>{it.unit}</td></tr>)}</tbody></table></div>
        </section>
      ))}
    </>
  );
}
