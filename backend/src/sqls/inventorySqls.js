const LIST_INVENTORY = `SELECT
    i.inventory_id, i.warehouse_id, i.item_id, i.quantity,
    w.name AS warehouse_name,
    it.name AS item_name, it.category, it.unit
  FROM inventory i
  JOIN warehouses w ON w.warehouse_id = i.warehouse_id AND w.archived_at IS NULL
  JOIN items it ON it.item_id = i.item_id AND it.archived_at IS NULL
  ORDER BY w.name, it.name`;

const GET_INVENTORY = `SELECT
    i.inventory_id, i.warehouse_id, i.item_id, i.quantity,
    w.name AS warehouse_name,
    it.name AS item_name, it.category, it.unit
  FROM inventory i
  JOIN warehouses w ON w.warehouse_id = i.warehouse_id AND w.archived_at IS NULL
  JOIN items it ON it.item_id = i.item_id AND it.archived_at IS NULL
  WHERE i.inventory_id = $1`;

const FIND_WAREHOUSE = 'SELECT warehouse_id FROM warehouses WHERE warehouse_id = $1 AND archived_at IS NULL';
const FIND_ITEM = 'SELECT item_id FROM items WHERE item_id = $1 AND archived_at IS NULL';

const ADD_INVENTORY = `INSERT INTO inventory (warehouse_id, item_id, quantity)
  VALUES ($1, $2, $3)
  ON CONFLICT (warehouse_id, item_id)
  DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity
  RETURNING inventory_id, warehouse_id, item_id, quantity`;

const REMOVE_INVENTORY = `UPDATE inventory
  SET quantity = quantity - $3
  WHERE warehouse_id = $1
    AND item_id = $2
    AND quantity >= $3
  RETURNING inventory_id, warehouse_id, item_id, quantity`;

const DELETE_INVENTORY = `UPDATE inventory SET archived_at = CURRENT_TIMESTAMP
  WHERE inventory_id = $1 AND archived_at IS NULL
  RETURNING inventory_id`;

module.exports = {
  LIST_INVENTORY,
  GET_INVENTORY,
  FIND_WAREHOUSE,
  FIND_ITEM,
  ADD_INVENTORY,
  REMOVE_INVENTORY,
  DELETE_INVENTORY,
};
