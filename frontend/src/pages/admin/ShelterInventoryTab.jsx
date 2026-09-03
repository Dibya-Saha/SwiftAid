import { useEffect, useState } from 'react';
import { adjustShelterInventory, fetchItems, fetchShelterInventory, fetchShelters } from '../../utils/api';
import Select from '../../components/Select';

export default function ShelterInventoryTab() {
  const [grouped, setGrouped] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [operation, setOperation] = useState('add');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [invRes, shRes, itemRes] = await Promise.all([fetchShelterInventory(), fetchShelters(), fetchItems()]);
      setGrouped(invRes.grouped || []);
      setShelters(shRes.shelters || []);
      setItems(itemRes.items || []);
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

  async function handleAdjust(event) {
    event.preventDefault();
    setMessage('');
    const amount = Number(quantity);
    if (!selected || !itemId || !Number.isInteger(amount) || amount <= 0) {
      setMessage('Select a shelter and item, then enter a positive integer quantity.');
      return;
    }
    setSaving(true);
    try {
      await adjustShelterInventory({
        shelter_id: Number(selected),
        item_id: Number(itemId),
        quantity: amount,
        operation,
        reason,
      });
      setMessage(`Shelter stock ${operation === 'add' ? 'received' : 'consumed'} successfully.`);
      setQuantity('');
      setReason('');
      await load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  const isSuccess = message.includes('successfully');

  return (
    <>
      <div className="info-card module-card">
        <p className="eyebrow">Adjust stock</p>
        {message && <div className={isSuccess ? 'success-banner' : 'error-banner'}>{message}</div>}
        <form onSubmit={handleAdjust}>
          <div className="form-grid">
            <div className="field"><label>Shelter</label><Select required value={selected} onChange={(e) => setSelected(e.target.value)} placeholder="Select shelter" options={[{ value: '', label: 'Select shelter' }, ...shelters.map((s) => ({ value: String(s.shelter_id), label: s.name }))]} /></div>
            <div className="field"><label>Item</label><Select required value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="Select item" options={[{ value: '', label: 'Select item' }, ...items.map((item) => ({ value: String(item.item_id), label: `${item.name} (${item.unit})` }))]} /></div>
          </div>
          <div className="form-grid">
            <div className="field"><label>Operation</label><Select value={operation} onChange={(e) => setOperation(e.target.value)} options={[{ value: 'add', label: 'Add stock' }, { value: 'remove', label: 'Remove stock' }]} /></div>
            <div className="field"><label>Quantity</label><input required min="1" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Enter a positive amount" /></div>
          </div>
          <div className="field"><label>Reason <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Daily consumption" /></div>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : operation === 'add' ? 'Add stock' : 'Remove stock'}</button>
        </form>
      </div>

      <div style={{ marginTop: 12, maxWidth: 300 }}>
        <Select value={selected} onChange={(e) => setSelected(e.target.value)} placeholder="All shelters" options={[{ value: '', label: 'All shelters' }, ...shelters.map((s) => ({ value: String(s.shelter_id), label: s.name }))]} />
      </div>

      {!filtered.length ? <div className="empty-state" style={{ marginTop: 16 }}>No shelter inventory yet. Donations via relief requests will appear here.</div> : filtered.map((g) => (
        <section key={g.shelter_id} className="module-section">
          <div className="section-heading"><div><div className="eyebrow">Stock register</div><h2>{g.shelter_name}</h2></div><span className="count-badge">{g.items.length} items</span></div>
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Item</th><th>Category</th><th>Quantity</th></tr></thead><tbody>{g.items.map((it) => <tr key={it.shelter_inventory_id}><td><strong>{it.item_name}</strong><small>#{it.item_id}</small></td><td>{it.category || '—'}</td><td>{it.quantity} {it.unit}</td></tr>)}</tbody></table></div>
        </section>
      ))}
    </>
  );
}
