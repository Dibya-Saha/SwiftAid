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

  return (
    <>
      <div className="info-card module-card" style={{ marginBottom: 16 }}>
        <p className="eyebrow">Shelter inventory</p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>View supplies donated to each shelter via relief requests. Inventory is independent per shelter.</p>
        <div style={{ marginTop: 12, maxWidth: 300 }}>
          <Select value={selected} onChange={(e) => setSelected(e.target.value)} placeholder="All shelters" options={[{ value: '', label: 'All shelters' }, ...shelters.map((s) => ({ value: String(s.shelter_id), label: s.name }))]} />
        </div>
        <form onSubmit={handleAdjust} className="form-grid" style={{ marginTop: 16, alignItems: 'end' }}>
          <label className="field" style={{ margin: 0 }}>
            <span className="field-label">Item</span>
            <Select value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="Select item" options={items.map((item) => ({ value: String(item.item_id), label: `${item.name} (${item.unit})` }))} required />
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span className="field-label">Operation</span>
            <Select value={operation} onChange={(e) => setOperation(e.target.value)} options={[{ value: 'add', label: 'Add stock' }, { value: 'remove', label: 'Consume / remove' }]} />
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span className="field-label">Quantity</span>
            <input className="field-input" type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 20" required />
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span className="field-label">Reason</span>
            <input className="field-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Daily consumption" />
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update stock'}</button>
        </form>
        {message && <div className={message.includes('successfully') ? 'success-banner' : 'error-banner'} style={{ marginTop: 12 }}>{message}</div>}
      </div>
      {!filtered.length ? <div className="empty-state">No shelter inventory yet. Donations via relief requests will appear here.</div> : filtered.map((g) => (
        <section key={g.shelter_id} className="module-section" style={{ marginTop: 20 }}>
          <div className="section-heading"><h2>{g.shelter_name}</h2><span className="count-badge">{g.items.length} items</span></div>
           <div className="table-wrap"><table className="data-table"><thead><tr><th>Item</th><th>Category</th><th>Quantity</th><th>Stock status</th><th>Unit</th></tr></thead><tbody>{g.items.map((it) => <tr key={it.shelter_inventory_id}><td><strong>{it.item_name}</strong><small>#{it.item_id}</small></td><td>{it.category || '—'}</td><td>{it.quantity}</td><td><span className={`status-badge ${it.quantity <= it.minimum_quantity ? 'status-pending' : 'status-approved'}`}>{it.quantity <= it.minimum_quantity ? 'LOW' : 'OK'}</span></td><td>{it.unit}</td></tr>)}</tbody></table></div>
        </section>
      ))}
    </>
  );
}
