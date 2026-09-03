const LIST_SHELTER_INVENTORY = `SELECT
    si.shelter_inventory_id, si.shelter_id, si.item_id, si.quantity,
    s.name AS shelter_name,
    i.name AS item_name, i.category, i.unit
  FROM shelter_inventory si
  JOIN shelters s ON s.shelter_id = si.shelter_id
  JOIN items i ON i.item_id = si.item_id
  ORDER BY s.name, i.name`;

const LIST_SHELTER_INVENTORY_BY_SHELTER = `SELECT
    si.shelter_inventory_id, si.shelter_id, si.item_id, si.quantity,
    s.name AS shelter_name,
    i.name AS item_name, i.category, i.unit
  FROM shelter_inventory si
  JOIN shelters s ON s.shelter_id = si.shelter_id
  JOIN items i ON i.item_id = si.item_id
  WHERE si.shelter_id = $1
  ORDER BY i.name`;

const UPSERT_SHELTER_INVENTORY = `INSERT INTO shelter_inventory (shelter_id, item_id, quantity)
  VALUES ($1, $2, $3)
  ON CONFLICT (shelter_id, item_id)
  DO UPDATE SET quantity = shelter_inventory.quantity + EXCLUDED.quantity
  RETURNING shelter_inventory_id, shelter_id, item_id, quantity`;

const FIND_SHELTER = 'SELECT shelter_id, name FROM shelters WHERE shelter_id = $1';

module.exports = {
  LIST_SHELTER_INVENTORY,
  LIST_SHELTER_INVENTORY_BY_SHELTER,
  UPSERT_SHELTER_INVENTORY,
  FIND_SHELTER,
};
