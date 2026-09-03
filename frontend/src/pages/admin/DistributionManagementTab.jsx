import { useEffect, useState } from 'react';
import Select from '../../components/Select';
import { createDistribution, fetchAllTeams, fetchDistributions, fetchInventory, fetchReliefRequest, fetchReliefRequests, fetchWarehouses } from '../../utils/api';

export default function DistributionManagementTab() {
  const [distributions, setDistributions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [teams, setTeams] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [requestId, setRequestId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [detail, setDetail] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [d, r, w, t, inv] = await Promise.all([fetchDistributions(), fetchReliefRequests(), fetchWarehouses(), fetchAllTeams(), fetchInventory()]);
      setDistributions(d.distributions || []);
      setRequests((r.requests || r.relief_requests || []).filter((item) => ['approved', 'waiting_stock', 'partially_fulfilled'].includes(String(item.status).toLowerCase())));
      setWarehouses(w.warehouses || []);
      setTeams((t.teams || []).filter((item) => String(item.status).toLowerCase() === 'approved'));
      setInventory(inv.inventory || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const stockByWarehouseItem = (() => {
    const map = new Map();
    for (const row of inventory) map.set(`${row.warehouse_id}:${row.item_id}`, Number(row.quantity) || 0);
    return map;
  })();

  const warehouseStockForDetail = (() => {
    if (!warehouseId || !detail?.items) return new Map();
    const m = new Map();
    for (const item of detail.items) {
      const key = `${warehouseId}:${item.item_id}`;
      m.set(item.request_item_id, stockByWarehouseItem.get(key) || 0);
    }
    return m;
  })();



  async function selectRequest(id) {
    setRequestId(id);
    setDetail(null);
    if (!id) return;
    try {
      const data = await fetchReliefRequest(id);
      const request = data.request || data;
      setDetail(request);
      const init = {};
      for (const item of request.items || []) {
        const remaining = item.remaining ?? item.quantity_requested - item.quantity_dispatched;
        const stock = warehouseId ? (stockByWarehouseItem.get(`${warehouseId}:${item.item_id}`) || 0) : remaining;
        const max = Math.min(remaining, stock);
        init[item.request_item_id] = String(max > 0 ? max : '');
      }
      setQuantities(init);
    } catch (err) { setError(err.message); }
  }

  useEffect(() => {
    if (!detail?.items) return;
    const next = {};
    for (const item of detail.items) {
      const remaining = item.remaining ?? item.quantity_requested - item.quantity_dispatched;
      const stock = warehouseId ? (stockByWarehouseItem.get(`${warehouseId}:${item.item_id}`) || 0) : 0;
      const max = warehouseId ? Math.min(remaining, stock) : remaining;
      const current = Number(quantities[item.request_item_id]);
      if (!warehouseId) next[item.request_item_id] = String(remaining);
      else if (!Number.isFinite(current) || current <= 0) next[item.request_item_id] = String(max > 0 ? max : '');
      else next[item.request_item_id] = String(Math.min(current, max) || '');
    }
    const same = Object.keys(next).length === Object.keys(quantities).length && Object.keys(next).every((k) => next[k] === quantities[k]);
    if (!same) setQuantities(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, detail, inventory]);

  async function submit(event) {
    event.preventDefault();
    setError(''); setMessage('');
    if (!warehouseId) { setError('Select a warehouse to see available stock before assigning.'); return; }
    const items = (detail?.items || []).map((item) => {
      const remaining = item.remaining ?? item.quantity_requested - item.quantity_dispatched;
      const stock = warehouseStockForDetail.get(item.request_item_id) ?? 0;
      const max = Math.min(remaining, stock);
      const qty = Number(quantities[item.request_item_id]);
      if (!Number.isFinite(qty) || qty <= 0) return null;
      if (qty > max) return { error: `${item.item_name}: transfer ${qty} exceeds min(remaining ${remaining}, warehouse stock ${stock})` };
      return { request_item_id: item.request_item_id, quantity: qty };
    }).filter(Boolean);
    const validationError = items.find((it) => it.error);
    if (validationError) { setError(validationError.error); return; }
    const validItems = items.filter((it) => it.request_item_id);
    if (!requestId || !warehouseId || !teamId || !validItems.length) { setError('Select a request, warehouse, team, and at least one quantity within warehouse stock.'); return; }
    setSaving(true);
    try {
      await createDistribution({ request_id: Number(requestId), warehouse_id: Number(warehouseId), team_id: Number(teamId), items: validItems });
      setMessage('Distribution assigned to the team.');
      setRequestId(''); setWarehouseId(''); setTeamId(''); setDetail(null); setQuantities({});
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const visibleRequests = requests;

  const hasNoStockForDetail = detail?.items?.length ? detail.items.every((item) => {
    let total = 0;
    for (const row of inventory) if (String(row.item_id) === String(item.item_id)) total += Number(row.quantity) || 0;
    return total === 0;
  }) : false;

  const warehouseOptions = detail?.items ? warehouses.filter((w) => {
    return detail.items.some((item) => {
      const key = `${w.warehouse_id}:${item.item_id}`;
      return (stockByWarehouseItem.get(key) || 0) > 0;
    });
  }) : warehouses;
  const effectiveWarehouseOptions = warehouseOptions.length ? warehouseOptions : warehouses;

  if (loading) return <div className="empty-state">Loading distributions...</div>;
  return <>
    <div className="info-card module-card">
      <p className="eyebrow">Warehouse transfer</p>
      <h2>Assign distribution</h2>
      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="field"><span className="field-label">Relief request</span><Select value={requestId} onChange={(e) => selectRequest(e.target.value)} placeholder="Select request" options={visibleRequests.map((r) => {
            const hasStock = detail && String(r.request_id) === String(requestId) ? !hasNoStockForDetail : true;
            let label = `#${r.request_id} — ${r.shelter_name}`;
            if (String(r.request_id) === String(requestId) && hasNoStockForDetail) label += ' — no warehouse stock';
            return { value: String(r.request_id), label };
          })} required /></label>
          <label className="field"><span className="field-label">Warehouse</span><Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder={detail ? (warehouseOptions.length ? 'Select warehouse' : 'No warehouse has stock for this request') : 'Select warehouse'} options={effectiveWarehouseOptions.map((w) => ({ value: String(w.warehouse_id), label: w.name }))} required /></label>
          <label className="field"><span className="field-label">Approved team</span><Select value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="Select team" options={teams.map((t) => ({ value: String(t.team_id), label: t.team_name }))} required /></label>
        </div>
        {hasNoStockForDetail && detail && <div className="error-banner">No warehouse has stock for the items in this request. Restock warehouse inventory before assigning.</div>}
        {detail && <div className="table-wrap"><table className="data-table"><thead><tr><th>Item</th><th>Remaining</th><th>Warehouse stock</th><th>Transfer quantity</th></tr></thead><tbody>{detail.items.map((item) => {
          const remaining = item.remaining ?? item.quantity_requested - item.quantity_dispatched;
          const stock = warehouseId ? (warehouseStockForDetail.get(item.request_item_id) ?? 0) : null;
          const max = stock !== null ? Math.min(remaining, stock) : remaining;
          const insufficient = stock !== null && stock < remaining;
          return <tr key={item.request_item_id}><td>{item.item_name} <small>{item.unit}</small></td><td>{remaining}</td><td>{stock === null ? '—' : stock}{insufficient && stock !== null && <small style={{ display: 'block', color: stock === 0 ? 'var(--danger, #e55353)' : 'var(--warning, #e5a253)' }}>{stock === 0 ? 'Out of stock' : `Limited to ${stock}`}</small>}</td><td><input className="field-input" type="number" min="0" max={max} value={quantities[item.request_item_id] || ''} onChange={(e) => setQuantities((prev) => ({ ...prev, [item.request_item_id]: e.target.value }))} disabled={!warehouseId || max === 0} placeholder={!warehouseId ? 'Select warehouse first' : max === 0 ? 'No stock' : `max ${max}`} /></td></tr>;
        })}</tbody></table></div>}
        <button className="btn-primary" type="submit" disabled={saving || (detail && (!warehouseId || hasNoStockForDetail))}>{saving ? 'Assigning...' : 'Assign distribution'}</button>
      </form>
    </div>
    <section className="module-section"><div className="section-heading"><h2>Distributions</h2><span className="count-badge">{distributions.length} total</span></div>{!distributions.length ? <div className="empty-state">No distributions assigned yet.</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>ID</th><th>Shelter</th><th>Warehouse</th><th>Team</th><th>Status</th></tr></thead><tbody>{distributions.map((item) => <tr key={item.distribution_id}><td>#{item.distribution_id}</td><td>{item.shelter_name}</td><td>{item.warehouse_name}</td><td>{item.team_name}</td><td><span className="status-badge">{item.status}</span></td></tr>)}</tbody></table></div>}</section>
  </>;
}
