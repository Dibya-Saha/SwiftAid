const pool = require('../db');
const {
  LIST_INVENTORY,
  GET_INVENTORY,
  FIND_WAREHOUSE,
  FIND_ITEM,
  ADJUST_INVENTORY,
  UPDATE_INVENTORY,
  DELETE_INVENTORY,
} = require('../sqls/inventorySqls');

function integer(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

async function listInventory(req, res) {
  try {
    const result = await pool.query(LIST_INVENTORY);
    return res.json({ inventory: result.rows });
  } catch (err) {
    console.error('[inventory/list] error:', err);
    return res.status(500).json({ message: 'Failed to load inventory' });
  }
}

async function getInventory(req, res) {
  try {
    const result = await pool.query(GET_INVENTORY, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Inventory record not found' });
    return res.json({ inventory: result.rows[0] });
  } catch (err) {
    console.error('[inventory/get] error:', err);
    return res.status(500).json({ message: 'Failed to load inventory record' });
  }
}

async function adjustInventory(req, res) {
  const warehouseId = integer(req.body.warehouse_id);
  const itemId = integer(req.body.item_id);
  const delta = integer(req.body.quantity);
  if (warehouseId === null || itemId === null || delta === null || delta === 0) {
    return res.status(400).json({ message: 'warehouse_id, item_id, and a non-zero integer quantity are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const warehouse = await client.query(FIND_WAREHOUSE, [warehouseId]);
    if (!warehouse.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    const item = await client.query(FIND_ITEM, [itemId]);
    if (!item.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Item not found' });
    }
    const result = await client.query(ADJUST_INVENTORY, [warehouseId, itemId, delta]);
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Insufficient stock for this adjustment' });
    }
    await client.query('COMMIT');
    return res.status(201).json({ inventory: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[inventory/adjust] error:', err);
    return res.status(500).json({ message: 'Failed to adjust inventory' });
  } finally {
    client.release();
  }
}

async function updateInventory(req, res) {
  const quantity = integer(req.body.quantity);
  if (quantity === null || quantity < 0) {
    return res.status(400).json({ message: 'quantity must be a non-negative integer' });
  }
  try {
    const result = await pool.query(UPDATE_INVENTORY, [quantity, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Inventory record not found' });
    return res.json({ inventory: result.rows[0] });
  } catch (err) {
    console.error('[inventory/update] error:', err);
    return res.status(500).json({ message: 'Failed to update inventory' });
  }
}

async function deleteInventory(req, res) {
  try {
    const result = await pool.query(DELETE_INVENTORY, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Inventory record not found' });
    return res.json({ message: 'Inventory record deleted' });
  } catch (err) {
    console.error('[inventory/delete] error:', err);
    return res.status(500).json({ message: 'Failed to delete inventory record' });
  }
}

module.exports = { listInventory, getInventory, adjustInventory, updateInventory, deleteInventory };
