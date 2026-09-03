import { useEffect, useState } from 'react';
import { fetchWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../../utils/api';
import { EMPTY_WAREHOUSE } from './adminConstants';

export default function WarehouseManagementTab() {
  const [form, setForm] = useState(EMPTY_WAREHOUSE);
  const [warehouses, setWarehouses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function refreshWarehouses() {
    const { warehouses: rows } = await fetchWarehouses();
    setWarehouses(rows);
  }

  useEffect(() => {
    refreshWarehouses().catch((err) => {
      setIsError(true);
      setMessage(err.message);
    });
  }, []);

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function startEdit(warehouse) {
    setEditingId(warehouse.warehouse_id);
    setForm({
      name: warehouse.name || '',
      division: warehouse.division || '',
      district: warehouse.district || '',
      upazila: warehouse.upazila || '',
      union: warehouse.union_name || '',
    });
    setMessage('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_WAREHOUSE);
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    try {
      const result = editingId ? await updateWarehouse(editingId, form) : await createWarehouse(form);
      setIsError(false);
      setMessage(result.message || (editingId ? 'Warehouse updated successfully.' : 'Warehouse created successfully.'));
      resetForm();
      await refreshWarehouses();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  async function removeWarehouse(id) {
    if (!window.confirm('Archive this warehouse? It will be hidden from future operations while its history is preserved.')) return;
    setMessage('');
    try {
      const result = await deleteWarehouse(id);
      setIsError(false);
      setMessage(result.message || 'Warehouse archived successfully.');
      if (editingId === id) resetForm();
      await refreshWarehouses();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  return (
    <>
      <div className="info-card module-card">
        <p className="eyebrow">{editingId ? 'Update warehouse' : 'Register warehouse'}</p>
        {message && <div className={isError ? 'error-banner' : 'success-banner'}>{message}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Warehouse name</label><input required value={form.name} onChange={updateField('name')} placeholder="Central Relief Warehouse" /></div>
          <div className="form-grid">
            <div className="field"><label>Division</label><input required value={form.division} onChange={updateField('division')} placeholder="Sylhet" /></div>
            <div className="field"><label>District</label><input required value={form.district} onChange={updateField('district')} placeholder="Sunamganj" /></div>
            <div className="field"><label>Upazila</label><input value={form.upazila} onChange={updateField('upazila')} /></div>
            <div className="field"><label>Union</label><input value={form.union} onChange={updateField('union')} /></div>
          </div>
          <div className="button-row">
            <button type="submit" className="btn-primary">{editingId ? 'Update warehouse' : 'Create warehouse'}</button>
            {editingId && <button type="button" className="btn-ghost" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <section className="module-section">
        <div className="section-heading">
          <div><div className="eyebrow">Warehouse registry</div><h2>Relief warehouses</h2></div>
          <span className="count-badge">{warehouses.length} total</span>
        </div>
        {!warehouses.length ? <div className="empty-state">No warehouses have been registered yet.</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Warehouse</th><th>Location</th><th>Actions</th></tr></thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.warehouse_id}>
                    <td><strong>{warehouse.name}</strong><small>#{warehouse.warehouse_id}</small></td>
                    <td>{[warehouse.district, warehouse.upazila, warehouse.union_name].filter(Boolean).join(' / ')}</td>
                    <td><div className="button-row"><button className="btn-ghost" onClick={() => startEdit(warehouse)}>Edit</button><button className="btn-danger" onClick={() => removeWarehouse(warehouse.warehouse_id)}>Archive</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
