import { useEffect, useState } from 'react';
import DashboardShell from '../components/DashboardShell';
import DisasterList from '../components/DisasterList';
import Select from '../components/Select';
import { createDonation, fetchMyDonations, fetchWarehouses, fetchItems } from '../utils/api';

function WarehouseCard({ warehouse, onChange, onClear }) {
  return (
    <div className="selected-card selected-card--warehouse">
      <div className="selected-card__content">
        <span className="selected-card__label">{warehouse.name}</span>
        {warehouse.location && <span className="selected-card__sublabel">{warehouse.location}</span>}
      </div>
      <div className="selected-card__actions">
        <button type="button" className="btn-ghost" onClick={onChange} style={{ padding: '6px 10px', fontSize: '12px' }}>Change</button>
        <button type="button" className="btn-ghost" onClick={onClear} aria-label={`Remove warehouse ${warehouse.name}`} style={{ padding: '6px 10px', fontSize: '12px' }}>×</button>
      </div>
    </div>
  );
}

function DonateTab({ onDonated }) {
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [rows, setRows] = useState([{ key: 1, itemId: '', quantity: '' }]);
  const [nextKey, setNextKey] = useState(2);
  const [editingWarehouse, setEditingWarehouse] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [wRes, iRes] = await Promise.all([fetchWarehouses(), fetchItems()]);
        if (cancelled) return;
        setWarehouses(wRes.warehouses || wRes.data || []);
        setItems(iRes.items || iRes.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function addRow() {
    if (rows.length >= 20) return;
    setRows((prev) => [...prev, { key: nextKey, itemId: '', quantity: '' }]);
    setNextKey((k) => k + 1);
  }

  function removeRow(key) {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key, field, value) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!warehouseId) {
      setError('Warehouse is required');
      return;
    }
    if (rows.length === 0) {
      setError('Add at least one item');
      return;
    }
    for (const r of rows) {
      if (!r.itemId) {
        setError('Each row must have an item selected');
        return;
      }
      const qty = Number(r.quantity);
      if (!r.quantity || !Number.isInteger(qty) || qty <= 0) {
        setError('Each quantity must be a positive integer');
        return;
      }
    }

    setSubmitting(true);
    try {
      await createDonation({
        warehouse_id: Number(warehouseId),
        items: rows.map((r) => ({ item_id: Number(r.itemId), quantity: Number(r.quantity) })),
      });
      setSuccess(`Donation recorded: ${rows.length} item(s) added to inventory`);
      // Keep selected warehouse, only clear item rows
      setRows([{ key: nextKey, itemId: '', quantity: '' }]);
      setNextKey((k) => k + 1);
      if (onDonated) onDonated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="empty-state">Loading warehouses and items…</div>;

  const warehouseOptions = warehouses.map((w) => ({ value: String(w.warehouse_id), label: w.name }));
  const itemOptions = items.map((it) => ({ value: String(it.item_id), label: `${it.name} — ${it.category} · ${it.unit}` }));
  const selectedWarehouse = warehouses.find((w) => String(w.warehouse_id) === String(warehouseId));
  const selectedItemIds = new Set(rows.map((r) => r.itemId).filter(Boolean));

  return (
    <div className="module-section">
      <h3 className="section-heading">Donate supplies</h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>Select one warehouse and add multiple items. Duplicates are merged automatically. New inventory rows are created if none exists.</p>
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}
      {warehouses.length === 0 && <div className="empty-state">No warehouses available. Please contact an admin.</div>}
      {items.length === 0 && <div className="empty-state">No items available. Please contact an admin.</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Warehouse (shared for all items)</span>
            {selectedWarehouse && !editingWarehouse ? (
              <WarehouseCard
                warehouse={selectedWarehouse}
                onChange={() => setEditingWarehouse(true)}
                onClear={() => { setWarehouseId(''); setEditingWarehouse(false); }}
              />
            ) : (
              <Select
                value={warehouseId}
                onChange={(e) => { setWarehouseId(String(e.target.value)); setEditingWarehouse(false); }}
                options={warehouseOptions}
                placeholder="Select Warehouse"
                required
              />
            )}
          </label>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <div className="section-heading" style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Items ({rows.length}/20)</div>
          {rows.map((row) => {
            const optionsForRow = itemOptions.map((opt) => ({
              ...opt,
              disabled: selectedItemIds.has(opt.value) && String(opt.value) !== String(row.itemId),
            }));
            return (
              <div key={row.key} style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: '0.5rem', alignItems: 'end', marginBottom: '0.6rem' }}>
                <label className="field" style={{ margin: 0 }}>
                  <span className="field-label">Item</span>
                  <Select value={row.itemId} onChange={(e) => {
                    console.log('[Donor] item selected:', e.target.value);
                    updateRow(row.key, 'itemId', String(e.target.value));
                  }} options={optionsForRow} placeholder="Select item" required />
                </label>
                <label className="field" style={{ margin: 0 }}>
                  <span className="field-label">Quantity</span>
                  <input className="field-input" type="number" min="1" step="1" value={row.quantity} onChange={(e) => updateRow(row.key, 'quantity', e.target.value)} placeholder="e.g. 100" required />
                </label>
                <button type="button" className="btn-ghost" onClick={() => removeRow(row.key)} disabled={rows.length === 1} title="Remove row" style={{ height: '42px' }}>
                  Remove
                </button>
              </div>
            );
          })}
          <div className="button-row" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn-secondary" onClick={addRow} disabled={rows.length >= 20}>Add Item</button>
          </div>
        </div>

        <div className="button-row" style={{ marginTop: '1rem' }}>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Donating…' : `Donate ${rows.length} item(s)`}</button>
        </div>
      </form>
    </div>
  );
}

function HistoryTab({ refreshKey }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetchMyDonations();
        if (!cancelled) setDonations(res.donations || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (loading) return <div className="empty-state">Loading donation history…</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (donations.length === 0) return <div className="empty-state">No donations yet. Use the Donate tab to make your first contribution.</div>;

  return (
    <div className="module-section">
      <h3 className="section-heading">My donations</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Warehouse</th>
              <th>Item</th>
              <th>Category</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.donation_id}>
                <td>{new Date(d.donated_at).toLocaleDateString()}</td>
                <td>{d.warehouse_name}</td>
                <td>{d.item_name}</td>
                <td><span className="status-badge">{d.category}</span></td>
                <td>{d.quantity} {d.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DonorDashboard() {
  const [activeTab, setActiveTab] = useState('disasters');
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const tabs = [
    { id: 'disasters', label: 'Disasters' },
    { id: 'donate', label: 'Donate' },
    { id: 'history', label: 'History' },
  ];

  const tabNav = (
    <nav className="tab-nav" role="tablist" aria-label="Donor sections">
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
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <DashboardShell
      layout="admin"
      heading="Your donations"
      lead="Support relief operations by donating supplies to warehouses."
      sidebar={tabNav}
    >
      <div
        key={activeTab}
        className="tab-content"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'disasters' && <DisasterList />}
        {activeTab === 'donate' && <DonateTab onDonated={() => setHistoryRefresh((k) => k + 1)} />}
        {activeTab === 'history' && <HistoryTab refreshKey={historyRefresh} />}
      </div>
    </DashboardShell>
  );
}
