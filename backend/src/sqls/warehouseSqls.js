const FIND_LOCATION = `SELECT location_id FROM locations
  WHERE division = $1 AND district = $2
    AND upazila IS NOT DISTINCT FROM $3
    AND union_name IS NOT DISTINCT FROM $4
  LIMIT 1`;

const INSERT_LOCATION = `INSERT INTO locations (division, district, upazila, union_name)
  VALUES ($1, $2, $3, $4)
  RETURNING location_id`;

const LIST_WAREHOUSES = `SELECT
    w.warehouse_id, w.name, w.admin_id,
    l.location_id, l.division, l.district, l.upazila, l.union_name
  FROM warehouses w
  JOIN locations l ON l.location_id = w.location_id
  WHERE w.archived_at IS NULL
  ORDER BY w.warehouse_id DESC`;

const GET_WAREHOUSE = `SELECT
    w.warehouse_id, w.name, w.admin_id,
    l.location_id, l.division, l.district, l.upazila, l.union_name
  FROM warehouses w
  JOIN locations l ON l.location_id = w.location_id
  WHERE w.warehouse_id = $1 AND w.archived_at IS NULL`;

const INSERT_WAREHOUSE = `INSERT INTO warehouses (name, admin_id, location_id)
  VALUES ($1, $2, $3)
  RETURNING warehouse_id, name, admin_id, location_id`;

const UPDATE_WAREHOUSE = `UPDATE warehouses
  SET name = $1, location_id = $2
  WHERE warehouse_id = $3 AND admin_id = $4 AND archived_at IS NULL
  RETURNING warehouse_id, name, admin_id, location_id`;

const DELETE_WAREHOUSE = `UPDATE warehouses SET archived_at = CURRENT_TIMESTAMP
  WHERE warehouse_id = $1 AND admin_id = $2 AND archived_at IS NULL
  RETURNING warehouse_id`;

module.exports = {
  FIND_LOCATION,
  INSERT_LOCATION,
  LIST_WAREHOUSES,
  GET_WAREHOUSE,
  INSERT_WAREHOUSE,
  UPDATE_WAREHOUSE,
  DELETE_WAREHOUSE,
};
