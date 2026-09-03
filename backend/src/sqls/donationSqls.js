const CREATE_DONATION = `INSERT INTO donations (donor_id, warehouse_id, item_id, quantity)
  VALUES ($1, $2, $3, $4)
  RETURNING donation_id, donor_id, warehouse_id, item_id, quantity, donated_at`;

const FIND_WAREHOUSE = 'SELECT warehouse_id FROM warehouses WHERE warehouse_id = $1 AND archived_at IS NULL';
const FIND_ITEM = 'SELECT item_id FROM items WHERE item_id = $1 AND archived_at IS NULL';

const UPSERT_INVENTORY = `INSERT INTO inventory (warehouse_id, item_id, quantity)
  VALUES ($1, $2, $3)
  ON CONFLICT (warehouse_id, item_id)
  DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity
  RETURNING inventory_id, warehouse_id, item_id, quantity`;

const LIST_MY_DONATIONS = `SELECT
    d.donation_id, d.quantity, d.donated_at,
    d.warehouse_id, d.item_id,
    w.name AS warehouse_name,
    i.name AS item_name, i.category, i.unit
  FROM donations d
  JOIN warehouses w ON w.warehouse_id = d.warehouse_id
  JOIN items i ON i.item_id = d.item_id
  WHERE d.donor_id = $1
  ORDER BY d.donated_at DESC, d.donation_id DESC`;

const LIST_DONATIONS = `SELECT
    d.donation_id, d.quantity, d.donated_at,
    d.donor_id, d.warehouse_id, d.item_id,
    u.full_name AS donor_name, u.email AS donor_email,
    w.name AS warehouse_name,
    i.name AS item_name, i.category, i.unit
  FROM donations d
  JOIN users u ON u.user_id = d.donor_id
  JOIN warehouses w ON w.warehouse_id = d.warehouse_id
  JOIN items i ON i.item_id = d.item_id
  ORDER BY d.donated_at DESC, d.donation_id DESC`;

const GET_DONATION = `SELECT
    d.donation_id, d.quantity, d.donated_at,
    d.donor_id, d.warehouse_id, d.item_id,
    u.full_name AS donor_name, u.email AS donor_email,
    w.name AS warehouse_name,
    i.name AS item_name, i.category, i.unit
  FROM donations d
  JOIN users u ON u.user_id = d.donor_id
  JOIN warehouses w ON w.warehouse_id = d.warehouse_id
  JOIN items i ON i.item_id = d.item_id
  WHERE d.donation_id = $1`;

module.exports = {
  CREATE_DONATION,
  FIND_WAREHOUSE,
  FIND_ITEM,
  UPSERT_INVENTORY,
  LIST_MY_DONATIONS,
  LIST_DONATIONS,
  GET_DONATION,
};
