const LIST_WAREHOUSES = `SELECT
    w.warehouse_id, w.name, w.admin_id,
    l.location_id, l.division, l.district, l.upazila, l.union_name,
    w.latitude, w.longitude
  FROM warehouses w
  JOIN locations l ON l.location_id = w.location_id
  WHERE w.archived_at IS NULL
  ORDER BY w.warehouse_id DESC`;

const GET_WAREHOUSE = `SELECT
    w.warehouse_id, w.name, w.admin_id,
    l.location_id, l.division, l.district, l.upazila, l.union_name,
    w.latitude, w.longitude
  FROM warehouses w
  JOIN locations l ON l.location_id = w.location_id
  WHERE w.warehouse_id = $1 AND w.archived_at IS NULL`;

const INSERT_WAREHOUSE = `INSERT INTO warehouses (name, admin_id, location_id, latitude, longitude)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING warehouse_id, name, admin_id, location_id, latitude, longitude`;

const UPDATE_WAREHOUSE = `UPDATE warehouses
  SET name = $1, location_id = $2, latitude = $3, longitude = $4
  WHERE warehouse_id = $5 AND admin_id = $6 AND archived_at IS NULL
  RETURNING warehouse_id, name, admin_id, location_id, latitude, longitude`;

const DELETE_WAREHOUSE = `UPDATE warehouses SET archived_at = CURRENT_TIMESTAMP
  WHERE warehouse_id = $1 AND admin_id = $2 AND archived_at IS NULL
  RETURNING warehouse_id`;

module.exports = {
  LIST_WAREHOUSES,
  GET_WAREHOUSE,
  INSERT_WAREHOUSE,
  UPDATE_WAREHOUSE,
  DELETE_WAREHOUSE,
};
