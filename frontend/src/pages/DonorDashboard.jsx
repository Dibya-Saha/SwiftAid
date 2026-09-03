import { useEffect, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import DisasterList from "../components/DisasterList";
import Select from "../components/Select";
import {
  createDonation,
  fetchMyDonations,
  fetchWarehouses,
  fetchItems,
  fetchInventory,
  fetchReliefRequests,
} from "../utils/api";

function WarehouseCard({ warehouse, onChange, onClear }) {
  return (
    <div className="selected-card selected-card--warehouse">
      <div className="selected-card__content">
        <span className="selected-card__label">{warehouse.name}</span>
        {warehouse.location && (
          <span className="selected-card__sublabel">{warehouse.location}</span>
        )}
      </div>
      <div className="selected-card__actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={onChange}
          style={{ padding: "6px 10px", fontSize: "12px" }}
        >
          Change
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={onClear}
          aria-label={`Remove warehouse ${warehouse.name}`}
          style={{ padding: "6px 10px", fontSize: "12px" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function DonateTab({ onDonated }) {
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [reliefRequests, setReliefRequests] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [rows, setRows] = useState([{ key: 1, itemId: "", quantity: "" }]);
  const [nextKey, setNextKey] = useState(2);
  const [editingWarehouse, setEditingWarehouse] = useState(false);
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadDonationOptions() {
    setError("");
    try {
      const [wRes, iRes, invRes, reqRes] = await Promise.all([
        fetchWarehouses(),
        fetchItems(),
        fetchInventory(),
        fetchReliefRequests(),
      ]);
      setWarehouses(wRes.warehouses || wRes.data || []);
      setItems(iRes.items || iRes.data || []);
      setInventory(invRes.inventory || []);
      const reqs = reqRes.requests || reqRes.relief_requests || [];
      setReliefRequests(reqs);
    } catch (err) {
      console.error("[Donor] failed to load donation form data:", err);
      setError(err.message || "Failed to load warehouses and items");
    }
  }

  useEffect(() => {
    async function init() { setLoading(true); await loadDonationOptions(); setLoading(false); }
    init();
  }, []);

  const stockByWarehouseItem = (() => {
    const m = new Map();
    for (const r of inventory) m.set(`${r.warehouse_id}:${r.item_id}`, Number(r.quantity) || 0);
    return m;
  })();

  const grouped = (() => {
    const map = {};
    for (const r of inventory) {
      const key = String(r.warehouse_id);
      if (!map[key]) map[key] = { warehouse_id: r.warehouse_id, warehouse_name: r.warehouse_name, items: [] };
      map[key].items.push(r);
    }
    return Object.values(map).sort((a, b) => String(a.warehouse_name).localeCompare(String(b.warehouse_name)));
  })();

  const neediest = [...reliefRequests]
    .filter((r) => (r.total_remaining ?? 0) > 0 && String(r.status).toLowerCase() !== 'fulfilled' && String(r.status).toLowerCase() !== 'rejected')
    .sort((a, b) => (b.total_remaining || 0) - (a.total_remaining || 0))
    .slice(0, 5);

  function parseSummary(r) {
    const s = r.items_summary;
    if (Array.isArray(s)) return s;
    if (typeof s === 'string') { try { return JSON.parse(s); } catch { return []; } }
    return [];
  }

  function addRow() {
    if (rows.length >= 20) return;
    setRows((prev) => [...prev, { key: nextKey, itemId: "", quantity: "" }]);
    setNextKey((k) => k + 1);
  }

  function removeRow(key) {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key, field, value) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!warehouseId) {
      setError("Warehouse is required");
      return;
    }
    if (rows.length === 0) {
      setError("Add at least one item");
      return;
    }
    for (const r of rows) {
      if (!r.itemId) {
        setError("Each row must have an item selected");
        return;
      }
      const qty = Number(r.quantity);
      if (!r.quantity || !Number.isInteger(qty) || qty <= 0) {
        setError("Each quantity must be a positive integer");
        return;
      }
    }

    setSubmitting(true);
    try {
      await createDonation({
        warehouse_id: Number(warehouseId),
        items: rows.map((r) => ({
          item_id: Number(r.itemId),
          quantity: Number(r.quantity),
        })),
      });
      setSuccess(
        `Donation recorded: ${rows.length} item(s) added to inventory`,
      );
      setEditingWarehouse(false);
      setRows([{ key: nextKey, itemId: "", quantity: "" }]);
      setNextKey((k) => k + 1);
      await loadDonationOptions();
      if (onDonated) onDonated();
    } catch (err) {
      console.error("[Donor] failed to create donation:", err);
      setError(err.message || "Failed to create donation");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <div className="empty-state">Loading warehouses and items…</div>;

  const groupedFiltered = filterWarehouse ? grouped.filter((g) => String(g.warehouse_id) === String(filterWarehouse)) : grouped;

  const warehouseOptions = warehouses.map((w) => {
    const g = grouped.find((x) => String(x.warehouse_id) === String(w.warehouse_id));
    const total = g ? g.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0;
    const lowCount = g ? g.items.filter((it) => (Number(it.quantity) || 0) <= 10).length : 0;
    const label = g ? `${w.name} — ${g.items.length} items • ${total} total ${lowCount ? `• ${lowCount} low` : ''}` : w.name;
    return { value: String(w.warehouse_id), label };
  });
  const itemOptions = items.map((it) => ({
    value: String(it.item_id),
    label: `${it.name} — ${it.category} · ${it.unit}`,
  }));
  const selectedWarehouse = warehouses.find(
    (w) => String(w.warehouse_id) === String(warehouseId),
  );
  const selectedItemIds = new Set(rows.map((r) => r.itemId).filter(Boolean));

  return (
    <>
      <div className="info-card module-card" style={{ marginBottom: 16 }}>
        <p className="eyebrow">Current warehouse stock</p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>All warehouses — low stock highlighted. Donate where needed most. <span style={{ color: 'var(--text)' }}>LOW ≤10</span></p>
        <div style={{ marginTop: 12, maxWidth: 300 }}>
          <Select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)} placeholder="All warehouses" options={[{ value: '', label: 'All warehouses' }, ...warehouses.map((w) => ({ value: String(w.warehouse_id), label: w.name }))]} />
        </div>
      </div>

      {!groupedFiltered.length ? <div className="empty-state" style={{ marginBottom: 16 }}>No inventory yet — your donation will create the first stock.</div> : groupedFiltered.map((g) => (
        <section key={g.warehouse_id} className="module-section">
          <div className="section-heading"><div><div className="eyebrow">Stock register</div><h2>{g.warehouse_name}</h2></div><span className="count-badge">{g.items.length} items</span></div>
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Item</th><th>Category</th><th>Quantity</th><th>Status</th></tr></thead><tbody>{g.items.map((record) => {
            const qty = Number(record.quantity) || 0;
            const isLow = qty <= 10;
            return <tr key={record.inventory_id}><td><strong>{record.item_name}</strong><small>#{record.item_id}</small></td><td>{record.category || '—'}</td><td>{qty} {record.unit}</td><td><span className={`status-badge ${isLow ? 'status-pending' : 'status-approved'}`}>{isLow ? 'LOW' : 'OK'}</span></td></tr>;
          })}</tbody></table></div>
        </section>
      ))}

      {neediest.length > 0 && (
        <section className="module-section">
          <div className="section-heading"><div><div className="eyebrow">Highest need</div><h2>Neediest relief requests</h2></div><span className="count-badge">{neediest.length} shown</span></div>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>Sorted by total remaining (requested − dispatched). Donating these items helps most.</p>
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Request</th><th>Shelter</th><th>Needed items</th><th>Total remaining</th></tr></thead><tbody>{neediest.map((r) => {
            const summary = parseSummary(r);
            return <tr key={r.request_id}><td>#{r.request_id} <small className="status-badge" style={{ marginLeft: 6 }}>{r.status}</small></td><td>{r.shelter_name}</td><td><div className="member-list" style={{ flexWrap: 'wrap' }}>{summary.map((it, idx) => <span key={idx} className="member-chip">{it.item_name} {it.remaining} {it.unit} needed<small style={{ marginLeft: 4, opacity: 0.8 }}>req {it.quantity_requested}</small></span>)}</div></td><td><strong>{r.total_remaining}</strong></td></tr>;
          })}</tbody></table></div>
        </section>
      )}

      <div className="module-section">
      <h3 className="section-heading">Donate supplies</h3>
      <p
        style={{
          color: "var(--text-muted)",
          marginBottom: "1rem",
          fontSize: "0.9rem",
        }}
      >
        Select one warehouse and add multiple items. Duplicates are merged
        automatically. New inventory rows are created if none exists.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}
      {warehouses.length === 0 && (
        <div className="empty-state">
          No warehouses available. Please contact an admin.
        </div>
      )}
      {items.length === 0 && (
        <div className="empty-state">
          No items available. Please contact an admin.
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">
              Warehouse (shared for all items)
            </span>
            {selectedWarehouse && !editingWarehouse ? (
              <WarehouseCard
                warehouse={selectedWarehouse}
                onChange={() => setEditingWarehouse(true)}
                onClear={() => {
                  setWarehouseId("");
                  setEditingWarehouse(false);
                }}
              />
            ) : (
              <Select
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(String(e.target.value));
                  setEditingWarehouse(false);
                }}
                options={warehouseOptions}
                placeholder="Select Warehouse"
                required
              />
            )}
          </label>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <div
            className="section-heading"
            style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}
          >
            Items ({rows.length}/20)
          </div>
          {rows.map((row) => {
            const optionsForRow = itemOptions.map((opt) => ({
              ...opt,
              disabled:
                selectedItemIds.has(opt.value) &&
                String(opt.value) !== String(row.itemId),
            }));
            const stockInSelected = warehouseId && row.itemId ? (stockByWarehouseItem.get(`${warehouseId}:${row.itemId}`) ?? 0) : null;
            const stockTotal = row.itemId ? (() => { let t=0; for (const r of inventory) if (String(r.item_id)===String(row.itemId)) t+= Number(r.quantity)||0; return t; })() : null;
            const isLow = stockInSelected !== null && stockInSelected <= 10;
            return (
              <div
                key={row.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 140px auto",
                  gap: "0.5rem",
                  alignItems: "end",
                  marginBottom: "0.6rem",
                }}
              >
                <label className="field" style={{ margin: 0 }}>
                  <span className="field-label">Item {stockInSelected !== null && <small style={{ fontWeight: 400, color: isLow ? 'var(--danger, #e55353)' : 'var(--muted)' }}>— {stockInSelected} in {selectedWarehouse ? selectedWarehouse.name : 'warehouse'}{isLow ? ' • LOW' : ''} {stockTotal !== null && stockInSelected !== stockTotal ? `• ${stockTotal} total` : ''}</small>}</span>
                  <Select
                    value={row.itemId}
                    onChange={(e) =>
                      updateRow(row.key, "itemId", String(e.target.value))
                    }
                    options={optionsForRow}
                    placeholder="Select item"
                    required
                  />
                  {row.itemId && !warehouseId && stockTotal !== null && <small style={{ color: 'var(--muted)', marginTop: 4, display: 'block' }}>Total across all warehouses: {stockTotal} {items.find((it)=>String(it.item_id)===String(row.itemId))?.unit || ''} — select a warehouse to see per-warehouse stock</small>}
                </label>
                <label className="field" style={{ margin: 0 }}>
                  <span className="field-label">Quantity</span>
                  <input
                    className="field-input"
                    type="number"
                    min="1"
                    step="1"
                    value={row.quantity}
                    onChange={(e) =>
                      updateRow(row.key, "quantity", e.target.value)
                    }
                    placeholder="e.g. 100"
                    required
                  />
                </label>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                  title="Remove row"
                  style={{ height: "42px" }}
                >
                  Remove
                </button>
              </div>
            );
          })}
          <div className="button-row" style={{ justifyContent: "flex-start" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={addRow}
              disabled={rows.length >= 20}
            >
              Add Item
            </button>
          </div>
        </div>

        <div className="button-row" style={{ marginTop: "1rem" }}>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Donating…" : `Donate ${rows.length} item(s)`}
          </button>
        </div>
      </form>
      </div>
    </>
  );
}

function HistoryTab({ refreshKey }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDonationHistory() {
      setLoading(true);
      setError("");
      try {
        const res = await fetchMyDonations();
        setDonations(res.donations || []);
      } catch (err) {
        console.error("[Donor] failed to load donation history:", err);
        setError(err.message || "Failed to load donation history");
      } finally {
        setLoading(false);
      }
    }

    loadDonationHistory();
  }, [refreshKey]);

  if (loading)
    return <div className="empty-state">Loading donation history…</div>;
  if (error) return <div className="error-banner">{error}</div>;
  if (donations.length === 0)
    return (
      <div className="empty-state">
        No donations yet. Use the Donate tab to make your first contribution.
      </div>
    );

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
                <td>
                  <span className="status-badge">{d.category}</span>
                </td>
                <td>
                  {d.quantity} {d.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DonorDashboard() {
  const [activeTab, setActiveTab] = useState("disasters");
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const tabs = [
    { id: "disasters", label: "Disasters" },
    { id: "donate", label: "Donate" },
    { id: "history", label: "History" },
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
          className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
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
        {activeTab === "disasters" && <DisasterList />}
        {activeTab === "donate" && (
          <DonateTab onDonated={() => setHistoryRefresh((k) => k + 1)} />
        )}
        {activeTab === "history" && <HistoryTab refreshKey={historyRefresh} />}
      </div>
    </DashboardShell>
  );
}
