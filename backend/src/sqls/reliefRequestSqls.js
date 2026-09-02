const FIND_SHELTER = 'SELECT shelter_id, name FROM shelters WHERE shelter_id = $1';
const FIND_ITEM = 'SELECT item_id FROM items WHERE item_id = $1';

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
};
