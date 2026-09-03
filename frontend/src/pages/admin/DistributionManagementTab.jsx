import { useEffect, useState } from 'react';
import Select from '../../components/Select';
import { createDistribution, fetchAllTeams, fetchDistributions, fetchReliefRequest, fetchReliefRequests, fetchWarehouses } from '../../utils/api';

export default function DistributionManagementTab() {
  const [distributions, setDistributions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [teams, setTeams] = useState([]);
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
      const [d, r, w, t] = await Promise.all([fetchDistributions(), fetchReliefRequests(), fetchWarehouses(), fetchAllTeams()]);
      setDistributions(d.distributions || []);
      setRequests((r.requests || r.relief_requests || []).filter((item) => ['approved', 'waiting_stock', 'partially_fulfilled'].includes(String(item.status).toLowerCase())));
      setWarehouses(w.warehouses || []);
      setTeams((t.teams || []).filter((item) => String(item.status).toLowerCase() === 'approved'));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function selectRequest(id) {
    setRequestId(id);
    setDetail(null);
    if (!id) return;
    try {
      const data = await fetchReliefRequest(id);
      const request = data.request || data;
      setDetail(request);
      setQuantities(Object.fromEntries((request.items || []).map((item) => [item.request_item_id, String(item.remaining ?? item.quantity_requested - item.quantity_dispatched)])));
    } catch (err) { setError(err.message); }
  }

  async function submit(event) {
    event.preventDefault();
    setError(''); setMessage('');
    const items = (detail?.items || []).map((item) => ({ request_item_id: item.request_item_id, quantity: Number(quantities[item.request_item_id]) })).filter((item) => item.quantity > 0);
    if (!requestId || !warehouseId || !teamId || !items.length) { setError('Select a request, warehouse, team, and at least one quantity.'); return; }
    setSaving(true);
    try {
      await createDistribution({ request_id: Number(requestId), warehouse_id: Number(warehouseId), team_id: Number(teamId), items });
      setMessage('Distribution assigned to the team.');
      setRequestId(''); setWarehouseId(''); setTeamId(''); setDetail(null); setQuantities({});
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="empty-state">Loading distributions...</div>;
  return <>
    <div className="info-card module-card">
      <p className="eyebrow">Warehouse transfer</p>
      <h2>Assign distribution</h2>
      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="field"><span className="field-label">Relief request</span><Select value={requestId} onChange={(e) => selectRequest(e.target.value)} placeholder="Select request" options={requests.map((r) => ({ value: String(r.request_id), label: `#${r.request_id} — ${r.shelter_name}` }))} required /></label>
          <label className="field"><span className="field-label">Warehouse</span><Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="Select warehouse" options={warehouses.map((w) => ({ value: String(w.warehouse_id), label: w.name }))} required /></label>
          <label className="field"><span className="field-label">Approved team</span><Select value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="Select team" options={teams.map((t) => ({ value: String(t.team_id), label: t.team_name }))} required /></label>
        </div>
        {detail && <div className="table-wrap"><table className="data-table"><thead><tr><th>Item</th><th>Remaining</th><th>Transfer quantity</th></tr></thead><tbody>{detail.items.map((item) => <tr key={item.request_item_id}><td>{item.item_name} <small>{item.unit}</small></td><td>{item.remaining ?? item.quantity_requested - item.quantity_dispatched}</td><td><input className="field-input" type="number" min="0" max={item.remaining ?? item.quantity_requested - item.quantity_dispatched} value={quantities[item.request_item_id] || ''} onChange={(e) => setQuantities((prev) => ({ ...prev, [item.request_item_id]: e.target.value }))} /></td></tr>)}</tbody></table></div>}
        <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Assigning...' : 'Assign distribution'}</button>
      </form>
    </div>
    <section className="module-section"><div className="section-heading"><h2>Distributions</h2><span className="count-badge">{distributions.length} total</span></div>{!distributions.length ? <div className="empty-state">No distributions assigned yet.</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>ID</th><th>Shelter</th><th>Warehouse</th><th>Team</th><th>Status</th></tr></thead><tbody>{distributions.map((item) => <tr key={item.distribution_id}><td>#{item.distribution_id}</td><td>{item.shelter_name}</td><td>{item.warehouse_name}</td><td>{item.team_name}</td><td><span className="status-badge">{item.status}</span></td></tr>)}</tbody></table></div>}</section>
  </>;
}
