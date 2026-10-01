// Reads back rows written by CALL record_donation($1, $2, $3) in creation
// order, joining each donation to its updated inventory row.
const GET_CREATED_DONATIONS = `SELECT d.donation_id, d.donor_id, d.warehouse_id,
    d.item_id, d.quantity, d.donated_at,
    i.inventory_id, i.quantity AS inventory_quantity
  FROM donations d
  JOIN inventory i ON i.warehouse_id = d.warehouse_id AND i.item_id = d.item_id
  WHERE d.donation_id = ANY($1)
  ORDER BY d.donation_id`;

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
  GET_CREATED_DONATIONS,
  LIST_MY_DONATIONS,
  LIST_DONATIONS,
  GET_DONATION,
};
