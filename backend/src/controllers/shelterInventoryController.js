const pool = require('../db');
const {
  LIST_SHELTER_INVENTORY,
  LIST_SHELTER_INVENTORY_BY_SHELTER,
  FIND_SHELTER,
  FIND_ITEM,
  ADD_SHELTER_INVENTORY,
  REMOVE_SHELTER_INVENTORY,
  INSERT_SHELTER_MOVEMENT,
} = require('../sqls/shelterInventorySqls');

function integer(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

async function listShelterInventory(req, res) {
  try {
    const result = await pool.query(LIST_SHELTER_INVENTORY);
    // Group by shelter
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.shelter_id]) {
        grouped[row.shelter_id] = { shelter_id: row.shelter_id, shelter_name: row.shelter_name, items: [] };
      }
       grouped[row.shelter_id].items.push({ shelter_inventory_id: row.shelter_inventory_id, item_id: row.item_id, item_name: row.item_name, category: row.category, unit: row.unit, quantity: row.quantity, minimum_quantity: row.minimum_quantity, updated_at: row.updated_at });
    }
    return res.json({ shelter_inventory: result.rows, grouped: Object.values(grouped) });
  } catch (err) {
    console.error('[shelterInventory/list] error:', err);
    return res.status(500).json({ message: 'Failed to load shelter inventory' });
  }
}

async function adjustShelterInventory(req, res) {
  const shelterId = integer(req.body.shelter_id);
  const itemId = integer(req.body.item_id);
  const quantity = integer(req.body.quantity);
  const operation = String(req.body.operation || '').toLowerCase();
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() || null : null;

  if (shelterId === null || itemId === null || quantity === null || quantity <= 0) {
    return res.status(400).json({ message: 'shelter_id, item_id, and a positive integer quantity are required' });
  }
  if (!['add', 'remove'].includes(operation)) {
    return res.status(400).json({ message: 'operation must be either add or remove' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const shelter = await client.query(FIND_SHELTER, [shelterId]);
    if (!shelter.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Shelter not found' });
    }
    const item = await client.query(FIND_ITEM, [itemId]);
    if (!item.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Item not found' });
    }

    const stock = await client.query(
      operation === 'add' ? ADD_SHELTER_INVENTORY : REMOVE_SHELTER_INVENTORY,
      [shelterId, itemId, quantity]
    );
    if (!stock.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Insufficient shelter stock for this removal' });
    }

    const movement = await client.query(INSERT_SHELTER_MOVEMENT, [
      shelterId, itemId, quantity, operation, reason, req.user.user_id,
    ]);
    await client.query('COMMIT');
    return res.status(201).json({ inventory: stock.rows[0], movement: movement.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[shelterInventory/adjust] error:', err);
    return res.status(500).json({ message: 'Failed to adjust shelter inventory' });
  } finally {
    client.release();
  }
}

async function getShelterInventoryByShelter(req, res) {
  const id = Number(req.params.shelterId);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid shelter id' });
  try {
    const shelter = await pool.query(FIND_SHELTER, [id]);
    if (!shelter.rows[0]) return res.status(404).json({ message: 'Shelter not found' });
    const result = await pool.query(LIST_SHELTER_INVENTORY_BY_SHELTER, [id]);
    return res.json({ shelter: shelter.rows[0], inventory: result.rows });
  } catch (err) {
    console.error('[shelterInventory/getByShelter] error:', err);
    return res.status(500).json({ message: 'Failed to load shelter inventory' });
  }
}

module.exports = { listShelterInventory, getShelterInventoryByShelter, adjustShelterInventory };
