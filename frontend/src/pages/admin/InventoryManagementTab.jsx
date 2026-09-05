import { useEffect, useState } from 'react';
import Select from '../../components/Select';
import { fetchInventory, adjustInventory, deleteInventory, fetchWarehouses, fetchItems } from '../../utils/api';
import { EMPTY_INVENTORY } from './adminConstants';

export default function InventoryManagementTab() {
  const [form, setForm] = useState(EMPTY_INVENTORY);
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [filterWarehouse, setFilterWarehouse] = useState('');

  async function refresh() {
    const [{ inventory: inventoryRows }, { warehouses: warehouseRows }, { items: itemRows }] = await Promise.all([
      fetchInventory(), fetchWarehouses(), fetchItems(),
    ]);
    setInventory(inventoryRows);
    setWarehouses(warehouseRows);
    setItems(itemRows);
  }

  useEffect(() => {
    refresh().catch((err) => {
      setIsError(true);
      setMessage(err.message);
    });
  }, []);

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    try {
      const result = await adjustInventory(form);
      setIsError(false);
      setMessage(result.message || 'Inventory adjusted successfully.');
      setForm(EMPTY_INVENTORY);
      await refresh();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  async function removeInventory(id) {
    if (!window.confirm('Archive this inventory record? Its history will be preserved.')) return;
    try {
      const result = await deleteInventory(id);
      setIsError(false);
      setMessage(result.message || 'Inventory record archived.');
      await refresh();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  const grouped = (() => {
    const map = {};
    for (const record of inventory) {
      const key = String(record.warehouse_id);
      if (!map[key]) map[key] = { warehouse_id: record.warehouse_id, warehouse_name: record.warehouse_name, items: [] };
      map[key].items.push(record);
    }
    return Object.values(map).sort((a, b) => String(a.warehouse_name).localeCompare(String(b.warehouse_name)));
  })();
  const filtered = filterWarehouse ? grouped.filter((g) => String(g.warehouse_id) === String(filterWarehouse)) : grouped;

  return (
    <>
      <div className="info-card module-card">
        <p className="eyebrow">Adjust stock</p>
        {message && <div className={isError ? 'error-banner' : 'success-banner'}>{message}</div>}
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field"><label>Warehouse</label><Select required value={form.warehouse_id} onChange={updateField('warehouse_id')} placeholder="Select warehouse" options={[{ value: '', label: 'Select warehouse' }, ...warehouses.map((warehouse) => ({ value: warehouse.warehouse_id, label: warehouse.name }))]} /></div>
            <div className="field"><label>Item</label><Select required value={form.item_id} onChange={updateField('item_id')} placeholder="Select item" options={[{ value: '', label: 'Select item' }, ...items.map((item) => ({ value: item.item_id, label: `${item.name} (${item.unit})` }))]} /></div>
          </div>
          <div className="form-grid">
            <div className="field"><label>Operation</label><Select value={form.operation} onChange={updateField('operation')} options={[{ value: 'add', label: 'Add stock' }, { value: 'remove', label: 'Remove stock' }]} /></div>
            <div className="field"><label>Quantity</label><input required min="1" type="number" value={form.quantity} onChange={updateField('quantity')} placeholder="Enter a positive amount" /></div>
          </div>
          <button type="submit" className="btn-primary">{form.operation === 'add' ? 'Add stock' : 'Remove stock'}</button>
        </form>
      </div>

      <div style={{ marginTop: 12, maxWidth: 300 }}>
        <Select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)} placeholder="All warehouses" options={[{ value: '', label: 'All warehouses' }, ...warehouses.map((w) => ({ value: String(w.warehouse_id), label: w.name }))]} />
      </div>

      {!filtered.length ? <div className="empty-state" style={{ marginTop: 16 }}>No inventory records have been created yet.</div> : filtered.map((g) => (
        <section key={g.warehouse_id} className="module-section">
          <div className="section-heading"><div><div className="eyebrow">Stock register</div><h2>{g.warehouse_name}</h2></div><span className="count-badge">{g.items.length} items</span></div>
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Item</th><th>Category</th><th>Quantity</th><th>Actions</th></tr></thead><tbody>{g.items.map((record) => <tr key={record.inventory_id}><td><strong>{record.item_name}</strong><small>#{record.item_id}</small></td><td>{record.category || '—'}</td><td>{record.quantity} {record.unit}</td><td><button className="btn-danger" onClick={() => removeInventory(record.inventory_id)}>Archive</button></td></tr>)}</tbody></table></div>
        </section>
      ))}
    </>
  );
}
