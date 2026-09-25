const FIND_SHELTER = 'SELECT shelter_id, name FROM shelters WHERE shelter_id = $1 AND archived_at IS NULL';
const FIND_ITEM = 'SELECT item_id FROM items WHERE item_id = $1 AND archived_at IS NULL';

const CREATE_RELIEF_REQUEST = `INSERT INTO relief_requests (shelter_id, requested_by_admin_id, status)
  VALUES ($1, $2, 'waiting_stock')
  RETURNING request_id, shelter_id, requested_by_admin_id, status, requested_at`;

const CREATE_REQUEST_ITEM = `INSERT INTO request_items (request_id, item_id, quantity_requested, quantity_dispatched)
  VALUES ($1, $2, $3, 0)
  RETURNING request_item_id, request_id, item_id, quantity_requested, quantity_dispatched`;

const LIST_RELIEF_REQUESTS = `SELECT
    rr.request_id, rr.shelter_id, rr.requested_by_admin_id, rr.status, rr.requested_at,
    s.name AS shelter_name,
    u.full_name AS requester_name, u.email AS requester_email,
    COALESCE((SELECT COUNT(*) FROM request_items ri WHERE ri.request_id = rr.request_id), 0)::int AS item_count,
    (SELECT s.total_requested FROM request_summary(rr.request_id) s) AS total_requested,
    (SELECT s.total_remaining FROM request_summary(rr.request_id) s) AS total_remaining,
    COALESCE((SELECT json_agg(json_build_object('item_name', i.name, 'unit', i.unit, 'quantity_requested', ri.quantity_requested, 'remaining', ri.quantity_requested - ri.quantity_dispatched) ORDER BY ri.request_item_id) FROM request_items ri JOIN items i ON i.item_id = ri.item_id WHERE ri.request_id = rr.request_id), '[]'::json) AS items_summary
  FROM relief_requests rr
  JOIN shelters s ON s.shelter_id = rr.shelter_id AND s.archived_at IS NULL
  JOIN users u ON u.user_id = rr.requested_by_admin_id
  WHERE LOWER(rr.status) <> 'rejected'
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
    i.name AS item_name, i.category, i.unit,
    COALESCE((
      SELECT SUM(di.quantity) FROM distribution_items di
      JOIN distributions d ON d.distribution_id = di.distribution_id
      WHERE di.request_item_id = ri.request_item_id
        AND d.status NOT IN ('delivered', 'cancelled')
    ), 0)::int AS assigned_active,
    request_item_available(ri.request_item_id) AS available
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
  JOIN shelters s ON s.shelter_id = rr.shelter_id AND s.archived_at IS NULL
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

// Reads back rows written by CALL donate_to_request($1, $2, $3) in creation
// order, joining each donation to its updated request item and shelter stock.
const GET_CREATED_REQUEST_DONATIONS = `SELECT d.donation_id, d.donor_id,
    d.shelter_id, d.request_id, d.item_id, d.quantity, d.donated_at,
    ri.request_item_id, ri.quantity_requested, ri.quantity_dispatched,
    si.shelter_inventory_id, si.quantity AS shelter_quantity
  FROM donations d
  JOIN request_items ri ON ri.request_id = d.request_id AND ri.item_id = d.item_id
  JOIN shelter_inventory si ON si.shelter_id = d.shelter_id AND si.item_id = d.item_id
  WHERE d.donation_id = ANY($1)
  ORDER BY d.donation_id`;

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
  GET_CREATED_REQUEST_DONATIONS,
};
