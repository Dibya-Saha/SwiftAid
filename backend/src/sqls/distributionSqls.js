const FIND_REQUEST = `SELECT request_id, shelter_id, status
  FROM relief_requests WHERE request_id = $1 FOR UPDATE`;

const FIND_TEAM = `SELECT team_id FROM teams
  WHERE team_id = $1 AND LOWER(status) = 'approved'`;

// Locks the request row and returns its database-computed free quantity in
// one round trip, so concurrent assignments serialize on the row lock.
const GET_ITEM_AVAILABILITY = `SELECT request_item_id, request_id, item_id,
    request_item_available(request_item_id) AS available
  FROM request_items WHERE request_item_id = $1 AND request_id = $2 FOR UPDATE`;

const RESERVE_WAREHOUSE_STOCK = `UPDATE inventory
  SET quantity = quantity - $3
  WHERE warehouse_id = $1 AND item_id = $2 AND archived_at IS NULL AND quantity >= $3
  RETURNING inventory_id, warehouse_id, item_id, quantity`;

const RETURN_WAREHOUSE_STOCK = `INSERT INTO inventory (warehouse_id, item_id, quantity)
  VALUES ($1, $2, $3)
  ON CONFLICT (warehouse_id, item_id)
  DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity, archived_at = NULL
  RETURNING inventory_id, warehouse_id, item_id, quantity`;

const CREATE_DISTRIBUTION = `INSERT INTO distributions
    (request_id, warehouse_id, assigned_team_id, assigned_by_admin_id, status)
  VALUES ($1, $2, $3, $4, 'assigned')
  RETURNING distribution_id, request_id, warehouse_id, assigned_team_id,
    assigned_by_admin_id, status, distributed_at, picked_up_at, delivered_at`;

const CREATE_DISTRIBUTION_ITEM = `INSERT INTO distribution_items
    (distribution_id, request_item_id, item_id, quantity)
  VALUES ($1, $2, $3, $4)
  RETURNING distribution_item_id, distribution_id, request_item_id, item_id, quantity`;

const LIST_DISTRIBUTIONS = `SELECT d.distribution_id, d.request_id,
    d.warehouse_id, d.assigned_team_id, d.assigned_by_admin_id, d.status,
    d.distributed_at, d.picked_up_at, d.delivered_at,
    w.name AS warehouse_name, s.name AS shelter_name, t.team_name,
    COALESCE(json_agg(json_build_object(
      'distribution_item_id', di.distribution_item_id,
      'request_item_id', di.request_item_id,
      'item_id', di.item_id,
      'item_name', i.name,
      'unit', i.unit,
      'quantity', di.quantity
    ) ORDER BY di.distribution_item_id) FILTER (WHERE di.distribution_item_id IS NOT NULL), '[]') AS items
  FROM distributions d
  JOIN relief_requests rr ON rr.request_id = d.request_id
  JOIN shelters s ON s.shelter_id = rr.shelter_id
  JOIN warehouses w ON w.warehouse_id = d.warehouse_id
  JOIN teams t ON t.team_id = d.assigned_team_id
  LEFT JOIN distribution_items di ON di.distribution_id = d.distribution_id
  LEFT JOIN items i ON i.item_id = di.item_id
  GROUP BY d.distribution_id, w.name, s.name, t.team_name
  ORDER BY d.distributed_at DESC, d.distribution_id DESC`;

const LIST_TEAM_DISTRIBUTIONS = `SELECT d.distribution_id, d.request_id,
    d.warehouse_id, d.assigned_team_id, d.assigned_by_admin_id, d.status,
    d.distributed_at, d.picked_up_at, d.delivered_at,
    w.name AS warehouse_name, s.name AS shelter_name, t.team_name,
    COALESCE(json_agg(json_build_object(
      'distribution_item_id', di.distribution_item_id,
      'request_item_id', di.request_item_id,
      'item_id', di.item_id,
      'item_name', i.name,
      'unit', i.unit,
      'quantity', di.quantity
    ) ORDER BY di.distribution_item_id) FILTER (WHERE di.distribution_item_id IS NOT NULL), '[]') AS items
  FROM distributions d
  JOIN relief_requests rr ON rr.request_id = d.request_id
  JOIN shelters s ON s.shelter_id = rr.shelter_id
  JOIN warehouses w ON w.warehouse_id = d.warehouse_id
  JOIN teams t ON t.team_id = d.assigned_team_id
  LEFT JOIN distribution_items di ON di.distribution_id = d.distribution_id
  LEFT JOIN items i ON i.item_id = di.item_id
  WHERE EXISTS (SELECT 1 FROM team_members tm_filter
    WHERE tm_filter.team_id = d.assigned_team_id AND tm_filter.user_id = $1)
  GROUP BY d.distribution_id, w.name, s.name, t.team_name
  ORDER BY d.distributed_at DESC, d.distribution_id DESC`;

const GET_DISTRIBUTION = `SELECT d.distribution_id, d.request_id,
    d.warehouse_id, d.assigned_team_id, d.assigned_by_admin_id, d.status,
    d.distributed_at, d.picked_up_at, d.delivered_at,
    w.name AS warehouse_name, s.name AS shelter_name, t.team_name,
    COALESCE(json_agg(json_build_object(
      'distribution_item_id', di.distribution_item_id,
      'request_item_id', di.request_item_id,
      'item_id', di.item_id,
      'item_name', i.name,
      'unit', i.unit,
      'quantity', di.quantity
    ) ORDER BY di.distribution_item_id) FILTER (WHERE di.distribution_item_id IS NOT NULL), '[]') AS items
  FROM distributions d
  JOIN relief_requests rr ON rr.request_id = d.request_id
  JOIN shelters s ON s.shelter_id = rr.shelter_id
  JOIN warehouses w ON w.warehouse_id = d.warehouse_id
  JOIN teams t ON t.team_id = d.assigned_team_id
  LEFT JOIN distribution_items di ON di.distribution_id = d.distribution_id
  LEFT JOIN items i ON i.item_id = di.item_id
  WHERE d.distribution_id = $1
  GROUP BY d.distribution_id, w.name, s.name, t.team_name
  ORDER BY d.distributed_at DESC, d.distribution_id DESC`;

const GET_DISTRIBUTION_ITEMS = `SELECT distribution_item_id, distribution_id,
    request_item_id, item_id, quantity
  FROM distribution_items WHERE distribution_id = $1`;

const LOCK_DISTRIBUTION = `SELECT d.distribution_id, d.request_id, d.warehouse_id,
    d.assigned_team_id, d.status, rr.shelter_id
  FROM distributions d JOIN relief_requests rr ON rr.request_id = d.request_id
  WHERE d.distribution_id = $1 FOR UPDATE`;

const UPDATE_DISTRIBUTION_STATUS = `UPDATE distributions
  SET status = $2::varchar,
      picked_up_at = CASE WHEN $2::varchar = 'picked_up' THEN CURRENT_TIMESTAMP ELSE picked_up_at END,
      delivered_at = CASE WHEN $2::varchar = 'delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END
  WHERE distribution_id = $1
  RETURNING distribution_id, request_id, warehouse_id, assigned_team_id,
    assigned_by_admin_id, status, distributed_at, picked_up_at, delivered_at`;

const APPROVE_REQUEST = `UPDATE relief_requests SET status = 'approved'
  WHERE request_id = $1 AND LOWER(status) = 'waiting_stock'
  RETURNING request_id, status`;

// Reads back the row stamped delivered by CALL deliver_distribution($1).
const GET_DELIVERED_DISTRIBUTION = `SELECT distribution_id, request_id,
    warehouse_id, assigned_team_id, assigned_by_admin_id, status,
    distributed_at, picked_up_at, delivered_at
  FROM distributions WHERE distribution_id = $1`;

module.exports = {
  FIND_REQUEST, FIND_TEAM, GET_ITEM_AVAILABILITY, RESERVE_WAREHOUSE_STOCK,
  RETURN_WAREHOUSE_STOCK, CREATE_DISTRIBUTION, CREATE_DISTRIBUTION_ITEM,
  LIST_DISTRIBUTIONS, LIST_TEAM_DISTRIBUTIONS, GET_DISTRIBUTION,
  GET_DISTRIBUTION_ITEMS, LOCK_DISTRIBUTION, UPDATE_DISTRIBUTION_STATUS,
  APPROVE_REQUEST, GET_DELIVERED_DISTRIBUTION,
};
