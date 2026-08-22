const LIST_INVENTORY = `SELECT
    i.inventory_id, i.warehouse_id, i.item_id, i.quantity,
    w.name AS warehouse_name,
    it.name AS item_name, it.category, it.unit
  FROM inventory i
  JOIN warehouses w ON w.warehouse_id = i.warehouse_id
  JOIN items it ON it.item_id = i.item_id
  ORDER BY w.name, it.name`;

const GET_INVENTORY = `SELECT
    i.inventory_id, i.warehouse_id, i.item_id, i.quantity,
    w.name AS warehouse_name,
    it.name AS item_name, it.category, it.unit
  FROM inventory i
  JOIN warehouses w ON w.warehouse_id = i.warehouse_id
  JOIN items it ON it.item_id = i.item_id
  WHERE i.inventory_id = $1`;

const FIND_WAREHOUSE = 'SELECT warehouse_id FROM warehouses WHERE warehouse_id = $1';
const FIND_ITEM = 'SELECT item_id FROM items WHERE item_id = $1';

const ADJUST_INVENTORY = `INSERT INTO inventory (warehouse_id, item_id, quantity)
  SELECT $1, $2, $3
  WHERE $3 >= 0
  ON CONFLICT (warehouse_id, item_id)
  DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity
  WHERE inventory.quantity + EXCLUDED.quantity >= 0
  RETURNING inventory_id, warehouse_id, item_id, quantity`;

const UPDATE_INVENTORY = `UPDATE inventory
  SET quantity = $1
  WHERE inventory_id = $2
  RETURNING inventory_id, warehouse_id, item_id, quantity`;

const DELETE_INVENTORY = `DELETE FROM inventory
  WHERE inventory_id = $1
  RETURNING inventory_id`;

module.exports = {
  LIST_INVENTORY,
  GET_INVENTORY,
  FIND_WAREHOUSE,
  FIND_ITEM,
  ADJUST_INVENTORY,
  UPDATE_INVENTORY,
  DELETE_INVENTORY,
};
