import { useEffect, useState } from 'react';
import Select from '../../components/Select';
import {
  createReliefRequest,
  fetchReliefRequests,
  fetchReliefRequest,
  updateReliefRequestStatus,
  updateReliefRequestItem,
  fetchShelters,
  fetchItems,
} from '../../utils/api';

const STATUSES = ['pending', 'waiting_stock', 'approved', 'partially_fulfilled', 'rejected', 'fulfilled'];

function emptyRow() {
  return { item_id: '', quantity_requested: '' };
}

export default function ReliefRequestManagementTab() {
  const [requests, setRequests] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [items, setItems] = useState([]);
  const [shelterId, setShelterId] = useState('');
  const [rows, setRows] = useState([emptyRow()]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [dispatchedEdits, setDispatchedEdits] = useState({});

  async function loadAll() {
    try {
      const [reqData, shelterData, itemData] = await Promise.all([
        fetchReliefRequests(),
        fetchShelters(),
        fetchItems(),
      ]);
      const reqs = reqData.requests || reqData.relief_requests || [];
      setRequests(reqs);
      setShelters(shelterData.shelters || []);
      setItems(itemData.items || []);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function viewDetail(id) {
    setSelectedId(id);
    setDetailError('');
    try {
      const data = await fetchReliefRequest(id);
      const req = data.request || data;
      setDetail(req);
      const edits = {};
      (req.items || []).forEach((it) => {
        edits[it.request_item_id] = String(it.quantity_dispatched);
      });
      setDispatchedEdits(edits);
    } catch (err) {
      setDetailError(err.message);
    }
  }

  function updateRow(index, field, value) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    if (rows.length >= 20) return;
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setMessage('');
    setIsError(false);
    try {
      const payload = {
        shelter_id: Number(shelterId),
        items: rows.map((r) => ({
          item_id: Number(r.item_id),
          quantity_requested: Number(r.quantity_requested),
        })),
      };
      await createReliefRequest(payload);
      setIsError(false);
      setMessage('Relief request created.');
      setShelterId('');
      setRows([emptyRow()]);
      const data = await fetchReliefRequests();
      setRequests(data.requests || data.relief_requests || []);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await updateReliefRequestStatus(id, status);
      const data = await fetchReliefRequests();
      setRequests(data.requests || data.relief_requests || []);
      if (selectedId === id) {
        const d = await fetchReliefRequest(id);
        setDetail(d.request || d);
      }
      setIsError(false);
      setMessage('Status updated.');
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  async function handleDispatchedSave(item) {
    const val = dispatchedEdits[item.request_item_id];
    const num = Number(val);
    if (!Number.isInteger(num) || num < 0) {
      setIsError(true);
      setMessage('quantity_dispatched must be a non-negative integer');
      return;
    }
    try {
      await updateReliefRequestItem(detail.request_id, item.request_item_id, num);
      setIsError(false);
      setMessage('Dispatched quantity updated.');
      const d = await fetchReliefRequest(detail.request_id);
      const req = d.request || d;
      setDetail(req);
      const edits = {};
      (req.items || []).forEach((it) => {
        edits[it.request_item_id] = String(it.quantity_dispatched);
      });
      setDispatchedEdits(edits);
      const data = await fetchReliefRequests();
      setRequests(data.requests || data.relief_requests || []);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  if (loading) return <div className="empty-state">Loading relief requests...</div>;

  return (
    <>
      <div className="info-card module-card">
        <p className="eyebrow">New relief request</p>
        {message && <div className={isError ? 'error-banner' : 'success-banner'}>{message}</div>}
        <form onSubmit={handleCreate}>
          <div className="field">
            <Select
              required
              value={shelterId}
              onChange={(e) => setShelterId(e.target.value)}
              placeholder="Select shelter"
              options={shelters.map((s) => ({ value: String(s.shelter_id), label: s.name }))}
            />
          </div>
          <div className="field">
            <label className="field-label">Requested items (max 20)</label>
            {rows.map((row, idx) => (
              <div key={idx} className="form-grid" style={{ marginBottom: 8 }}>
                <Select
                  required
                  value={row.item_id}
                  onChange={(e) => updateRow(idx, 'item_id', e.target.value)}
                  placeholder="Select item"
                  options={items.map((it) => ({ value: String(it.item_id), label: `${it.name} (${it.unit})` }))}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    required
                    min="1"
                    type="number"
                    placeholder="Qty"
                    value={row.quantity_requested}
                    onChange={(e) => updateRow(idx, 'quantity_requested', e.target.value)}
                    style={{ flex: 1, background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)', padding: '11px 12px', borderRadius: 4, fontSize: 14 }}
                  />
                  {rows.length > 1 && (
                    <button type="button" className="btn-ghost" onClick={() => removeRow(idx)}>Remove</button>
                  )}
                </div>
              </div>
            ))}
            <div className="button-row" style={{ marginTop: 8 }}>
              <button type="button" className="btn-ghost" onClick={addRow} disabled={rows.length >= 20}>Add item</button>
              <span className="count-badge">{rows.length}/20</span>
            </div>
          </div>
          <button type="submit" className="btn-primary">Create request</button>
        </form>
      </div>

      <section className="module-section relief-requests">
        <div className="section-heading">
          <h2>Relief requests</h2>
          <span className="count-badge">{requests.length} TOTAL</span>
        </div>
        {!requests.length ? (
          <div className="empty-state">No relief requests found.</div>
        ) : (
          <div className="table-wrap relief-table-wrap">
            <table className="data-table relief-table">
              <colgroup>
                <col style={{ width: '68px' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '118px' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '112px' }} />
                <col style={{ width: '148px' }} />
              </colgroup>
              <thead>
                <tr><th>ID</th><th>SHELTER</th><th>STATUS</th><th>REQUESTER</th><th>DATE</th><th>ACTIONS</th></tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.request_id} onClick={() => viewDetail(r.request_id)} style={{ cursor: 'pointer' }}>
                    <td>#{r.request_id}</td>
                    <td title={r.shelter_name || ''}>{r.shelter_name || r.shelter_id}</td>
                    <td><span className="status-badge">{r.status}</span></td>
                    <td><strong>{r.requester_name || '—'}</strong><small>{r.requester_email || ''}</small></td>
                    <td>{r.requested_at ? new Date(r.requested_at).toLocaleDateString() : '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.request_id, e.target.value)}
                        options={STATUSES.map((s) => ({ value: s, label: s }))}
                        variant="pill"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedId && (
        <section className="module-section">
          <div className="section-heading">
            <div><div className="eyebrow">Detail</div><h2>Request #{selectedId}</h2></div>
            <button className="btn-ghost" onClick={() => { setSelectedId(null); setDetail(null); }}>Close</button>
          </div>
          {detailError && <div className="error-banner">{detailError}</div>}
          {!detail ? (
            <div className="empty-state">Loading detail...</div>
          ) : (
            <>
              <div className="info-card" style={{ marginBottom: 16 }}>
                <p><strong>Shelter:</strong> {detail.shelter_name} (#{detail.shelter_id})</p>
                <p><strong>Status:</strong> <span className="status-badge">{detail.status}</span></p>
                <p><strong>Requested at:</strong> {detail.requested_at ? new Date(detail.requested_at).toLocaleString() : '—'}</p>
                <p><strong>Requester:</strong> {detail.requester_name || detail.requested_by_admin_id}</p>
                <div style={{ marginTop: 12 }}>
                  <label className="field-label">Change status</label>
                  <Select
                    value={detail.status}
                    onChange={(e) => handleStatusChange(detail.request_id, e.target.value)}
                    options={STATUSES.map((s) => ({ value: s, label: s }))}
                  />
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Item</th><th>Category</th><th>Requested</th><th>Dispatched</th><th>Actions</th></tr></thead>
                  <tbody>
                    {(detail.items || []).map((it) => (
                      <tr key={it.request_item_id}>
                        <td><strong>{it.item_name}</strong><small>{it.unit}</small></td>
                        <td>{it.category || '—'}</td>
                        <td>{it.quantity_requested}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={it.quantity_requested}
                            value={dispatchedEdits[it.request_item_id] ?? ''}
                            onChange={(e) => setDispatchedEdits((prev) => ({ ...prev, [it.request_item_id]: e.target.value }))}
                            style={{ width: 90, background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', borderRadius: 4 }}
                          />
                        </td>
                        <td>
                          <button className="btn-ghost" onClick={() => handleDispatchedSave(it)}>Save</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
