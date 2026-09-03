const LIST_SHELTER_INVENTORY = `SELECT
    si.shelter_inventory_id, si.shelter_id, si.item_id, si.quantity,
    si.minimum_quantity, si.updated_at,
    s.name AS shelter_name,
    i.name AS item_name, i.category, i.unit
  FROM shelter_inventory si
  JOIN shelters s ON s.shelter_id = si.shelter_id
  JOIN items i ON i.item_id = si.item_id
  ORDER BY s.name, i.name`;

const LIST_SHELTER_INVENTORY_BY_SHELTER = `SELECT
    si.shelter_inventory_id, si.shelter_id, si.item_id, si.quantity,
    si.minimum_quantity, si.updated_at,
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

const FIND_ITEM = 'SELECT item_id, name, category, unit FROM items WHERE item_id = $1';

const ADD_SHELTER_INVENTORY = `INSERT INTO shelter_inventory (shelter_id, item_id, quantity, updated_at)
  VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
  ON CONFLICT (shelter_id, item_id)
  DO UPDATE SET quantity = shelter_inventory.quantity + EXCLUDED.quantity,
                updated_at = CURRENT_TIMESTAMP
  RETURNING shelter_inventory_id, shelter_id, item_id, quantity, minimum_quantity, updated_at`;

const REMOVE_SHELTER_INVENTORY = `UPDATE shelter_inventory
  SET quantity = quantity - $3, updated_at = CURRENT_TIMESTAMP
  WHERE shelter_id = $1 AND item_id = $2 AND quantity >= $3
  RETURNING shelter_inventory_id, shelter_id, item_id, quantity, minimum_quantity, updated_at`;

const INSERT_SHELTER_MOVEMENT = `INSERT INTO shelter_inventory_movements
  (shelter_id, item_id, quantity, operation, reason, created_by)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING movement_id, shelter_id, item_id, quantity, operation, reason, created_by, created_at`;

module.exports = {
  LIST_SHELTER_INVENTORY,
  LIST_SHELTER_INVENTORY_BY_SHELTER,
  UPSERT_SHELTER_INVENTORY,
  FIND_SHELTER,
  FIND_ITEM,
  ADD_SHELTER_INVENTORY,
  REMOVE_SHELTER_INVENTORY,
  INSERT_SHELTER_MOVEMENT,
};
