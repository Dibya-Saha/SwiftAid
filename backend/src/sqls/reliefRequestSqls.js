const FIND_SHELTER = 'SELECT shelter_id, name FROM shelters WHERE shelter_id = $1 AND archived_at IS NULL';
const FIND_ITEM = 'SELECT item_id FROM items WHERE item_id = $1 AND archived_at IS NULL';

const CREATE_RELIEF_REQUEST = `INSERT INTO relief_requests (shelter_id, requested_by_admin_id, status)
  VALUES ($1, $2, 'pending')
  RETURNING request_id, shelter_id, requested_by_admin_id, status, requested_at`;

const CREATE_REQUEST_ITEM = `INSERT INTO request_items (request_id, item_id, quantity_requested, quantity_dispatched)
  VALUES ($1, $2, $3, 0)
  RETURNING request_item_id, request_id, item_id, quantity_requested, quantity_dispatched`;

const LIST_RELIEF_REQUESTS = `SELECT
    rr.request_id, rr.shelter_id, rr.requested_by_admin_id, rr.status, rr.requested_at,
    s.name AS shelter_name,
    u.full_name AS requester_name, u.email AS requester_email
  FROM relief_requests rr
  JOIN shelters s ON s.shelter_id = rr.shelter_id
  JOIN users u ON u.user_id = rr.requested_by_admin_id
  ORDER BY rr.requested_at DESC, rr.request_id DESC`;

const GET_RELIEF_REQUEST = `SELECT
    rr.request_id, rr.shelter_id, rr.requested_by_admin_id, rr.status, rr.requested_at,
    s.name AS shelter_name, s.address AS shelter_address,
    u.full_name AS requester_name, u.email AS requester_email
  FROM relief_requests rr
  JOIN shelters s ON s.shelter_id = rr.shelter_id
  JOIN users u ON u.user_id = rr.requested_by_admin_id
  WHERE rr.request_id = $1`;

const GET_REQUEST_ITEMS = `SELECT
    ri.request_item_id, ri.request_id, ri.item_id, ri.quantity_requested, ri.quantity_dispatched,
    i.name AS item_name, i.category, i.unit
  FROM request_items ri
  JOIN items i ON i.item_id = ri.item_id
  WHERE ri.request_id = $1
  ORDER BY ri.request_item_id ASC`;

const FIND_RELIEF_REQUEST = 'SELECT request_id, status FROM relief_requests WHERE request_id = $1';

const UPDATE_REQUEST_STATUS = `UPDATE relief_requests SET status = $2 WHERE request_id = $1
  RETURNING request_id, shelter_id, requested_by_admin_id, status, requested_at`;

const FIND_REQUEST_ITEM = 'SELECT request_item_id, request_id, item_id, quantity_requested, quantity_dispatched FROM request_items WHERE request_item_id = $1 AND request_id = $2';

const FIND_REQUEST_ITEM_BY_ITEM = 'SELECT request_item_id, request_id, item_id, quantity_requested, quantity_dispatched FROM request_items WHERE request_id = $1 AND item_id = $2';

const UPDATE_DISPATCHED = `UPDATE request_items SET quantity_dispatched = $3
  WHERE request_item_id = $1 AND request_id = $2
  RETURNING request_item_id, request_id, item_id, quantity_requested, quantity_dispatched`;

// Donor-visible: only requests with shortage and not rejected/fulfilled
const LIST_ELIGIBLE_REQUESTS = `SELECT
    rr.request_id, rr.shelter_id, rr.requested_by_admin_id, rr.status, rr.requested_at,
    s.name AS shelter_name
  FROM relief_requests rr
  JOIN shelters s ON s.shelter_id = rr.shelter_id
  WHERE LOWER(rr.status) NOT IN ('rejected','fulfilled')
    AND EXISTS (
      SELECT 1 FROM request_items ri
      WHERE ri.request_id = rr.request_id
        AND ri.quantity_requested > ri.quantity_dispatched
    )
  ORDER BY rr.requested_at DESC, rr.request_id DESC`;

const GET_ELIGIBLE_REQUEST_ITEMS = `SELECT
    ri.request_item_id, ri.request_id, ri.item_id,
    ri.quantity_requested, ri.quantity_dispatched,
    (ri.quantity_requested - ri.quantity_dispatched) AS remaining,
    i.name AS item_name, i.unit
  FROM request_items ri
  JOIN items i ON i.item_id = ri.item_id
  WHERE ri.request_id = $1
    AND ri.quantity_requested > ri.quantity_dispatched
  ORDER BY ri.request_item_id ASC`;

// Lock queries for transactional donate
const LOCK_RELIEF_REQUEST = 'SELECT request_id, shelter_id, status FROM relief_requests WHERE request_id = $1 FOR UPDATE';
const LOCK_REQUEST_ITEM = 'SELECT request_item_id, request_id, item_id, quantity_requested, quantity_dispatched FROM request_items WHERE request_id = $1 AND item_id = $2 FOR UPDATE';
const LOCK_REQUEST_ITEMS_ALL = 'SELECT request_item_id, quantity_requested, quantity_dispatched FROM request_items WHERE request_id = $1 FOR UPDATE';
const UPDATE_DISPATCHED_INCREMENT = `UPDATE request_items SET quantity_dispatched = quantity_dispatched + $3
  WHERE request_item_id = $1 AND request_id = $2
  RETURNING request_item_id, request_id, item_id, quantity_requested, quantity_dispatched`;
const CREATE_DONATION_FOR_REQUEST = `INSERT INTO donations (donor_id, shelter_id, request_id, item_id, quantity)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING donation_id, donor_id, shelter_id, request_id, item_id, quantity, donated_at`;
const UPSERT_SHELTER_INVENTORY_TX = `INSERT INTO shelter_inventory (shelter_id, item_id, quantity)
  VALUES ($1, $2, $3)
  ON CONFLICT (shelter_id, item_id)
  DO UPDATE SET quantity = shelter_inventory.quantity + EXCLUDED.quantity
  RETURNING shelter_inventory_id, shelter_id, item_id, quantity`;

module.exports = {
  FIND_SHELTER,
  FIND_ITEM,
  CREATE_RELIEF_REQUEST,
  CREATE_REQUEST_ITEM,
  LIST_RELIEF_REQUESTS,
  GET_RELIEF_REQUEST,
  GET_REQUEST_ITEMS,
  FIND_RELIEF_REQUEST,
  UPDATE_REQUEST_STATUS,
  FIND_REQUEST_ITEM,
  FIND_REQUEST_ITEM_BY_ITEM,
  UPDATE_DISPATCHED,
  LIST_ELIGIBLE_REQUESTS,
  GET_ELIGIBLE_REQUEST_ITEMS,
  LOCK_RELIEF_REQUEST,
  LOCK_REQUEST_ITEM,
  LOCK_REQUEST_ITEMS_ALL,
  UPDATE_DISPATCHED_INCREMENT,
  CREATE_DONATION_FOR_REQUEST,
  UPSERT_SHELTER_INVENTORY_TX,
};
