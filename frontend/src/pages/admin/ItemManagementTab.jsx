import { useEffect, useState } from 'react';
import Select from '../../components/Select';
import { fetchItems, createItem, updateItem, deleteItem } from '../../utils/api';
import { EMPTY_ITEM, ITEM_CATEGORIES, ITEM_UNITS } from './adminConstants';

export default function ItemManagementTab() {
  const [form, setForm] = useState(EMPTY_ITEM);
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function refreshItems() {
    const { items: rows } = await fetchItems();
    setItems(rows);
  }

  useEffect(() => {
    refreshItems().catch((err) => {
      setIsError(true);
      setMessage(err.message);
    });
  }, []);

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function startEdit(item) {
    setEditingId(item.item_id);
    setForm({ name: item.name || '', category: item.category || '', unit: item.unit || '' });
    setMessage('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_ITEM);
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    try {
      const result = editingId ? await updateItem(editingId, form) : await createItem(form);
      setIsError(false);
      setMessage(result.message || (editingId ? 'Item updated successfully.' : 'Item created successfully.'));
      resetForm();
      await refreshItems();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  async function removeItem(id) {
    if (!window.confirm('Delete this item?')) return;
    setMessage('');
    try {
      const result = await deleteItem(id);
      setIsError(false);
      setMessage(result.message || 'Item deleted successfully.');
      if (editingId === id) resetForm();
      await refreshItems();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  return (
    <>
      <div className="info-card module-card">
        <p className="eyebrow">{editingId ? 'Update item' : 'Add item'}</p>
        {message && <div className={isError ? 'error-banner' : 'success-banner'}>{message}</div>}
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field"><label>Item name</label><input required value={form.name} onChange={updateField('name')} placeholder="Rice" /></div>
            <div className="field"><label>Unit</label><Select required value={form.unit} onChange={updateField('unit')} placeholder="Select unit" options={[{ value: '', label: 'Select unit' }, ...ITEM_UNITS.map((unit) => ({ value: unit, label: unit }))]} /></div>
          </div>
          <div className="field"><label>Category</label><Select required value={form.category} onChange={updateField('category')} placeholder="Select category" options={[{ value: '', label: 'Select category' }, ...ITEM_CATEGORIES.map((category) => ({ value: category, label: category.charAt(0).toUpperCase() + category.slice(1) }))]} /></div>
          <div className="button-row">
            <button type="submit" className="btn-primary">{editingId ? 'Update item' : 'Create item'}</button>
            {editingId && <button type="button" className="btn-ghost" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <section className="module-section">
        <div className="section-heading">
          <div><div className="eyebrow">Item catalog</div><h2>Relief items</h2></div>
          <span className="count-badge">{items.length} total</span>
        </div>
        {!items.length ? <div className="empty-state">No items have been added yet.</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Item</th><th>Category</th><th>Unit</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.item_id}>
                    <td><strong>{item.name}</strong><small>#{item.item_id}</small></td>
                    <td>{item.category || '—'}</td>
                    <td>{item.unit}</td>
                    <td><div className="button-row"><button className="btn-ghost" onClick={() => startEdit(item)}>Edit</button><button className="btn-danger" onClick={() => removeItem(item.item_id)}>Delete</button></div></td>
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
