const pool = require('../db');
const { LIST_SHELTER_INVENTORY, LIST_SHELTER_INVENTORY_BY_SHELTER, FIND_SHELTER } = require('../sqls/shelterInventorySqls');

async function listShelterInventory(req, res) {
  try {
    const result = await pool.query(LIST_SHELTER_INVENTORY);
    // Group by shelter
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.shelter_id]) {
        grouped[row.shelter_id] = { shelter_id: row.shelter_id, shelter_name: row.shelter_name, items: [] };
      }
      grouped[row.shelter_id].items.push({ shelter_inventory_id: row.shelter_inventory_id, item_id: row.item_id, item_name: row.item_name, category: row.category, unit: row.unit, quantity: row.quantity });
    }
    return res.json({ shelter_inventory: result.rows, grouped: Object.values(grouped) });
  } catch (err) {
    console.error('[shelterInventory/list] error:', err);
    return res.status(500).json({ message: 'Failed to load shelter inventory' });
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

module.exports = { listShelterInventory, getShelterInventoryByShelter };
