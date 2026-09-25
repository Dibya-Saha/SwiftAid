const LIST_SHELTERS = `SELECT
    s.shelter_id, s.name, s.address, s.capacity, s.admin_id,
    l.location_id, l.division, l.district, l.upazila, l.union_name,
    s.latitude, s.longitude,
    shelter_remaining_capacity(s.shelter_id) AS remaining_capacity
  FROM shelters s
  JOIN locations l ON l.location_id = s.location_id
  WHERE s.archived_at IS NULL
  ORDER BY s.shelter_id DESC`;

const GET_SHELTER = `SELECT
    s.shelter_id, s.name, s.address, s.capacity, s.admin_id,
    l.location_id, l.division, l.district, l.upazila, l.union_name,
    s.latitude, s.longitude,
    shelter_remaining_capacity(s.shelter_id) AS remaining_capacity
  FROM shelters s
  JOIN locations l ON l.location_id = s.location_id
  WHERE s.shelter_id = $1 AND s.archived_at IS NULL`;

const INSERT_SHELTER = `INSERT INTO shelters (name, address, capacity, admin_id, location_id, latitude, longitude)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING shelter_id, name, address, capacity, admin_id, location_id, latitude, longitude`;

const UPDATE_SHELTER = `UPDATE shelters
  SET name = $1, address = $2, capacity = $3, location_id = $4, latitude = $5, longitude = $6
  WHERE shelter_id = $7 AND admin_id = $8 AND archived_at IS NULL
  RETURNING shelter_id, name, address, capacity, admin_id, location_id, latitude, longitude`;

const DELETE_SHELTER = `UPDATE shelters SET archived_at = CURRENT_TIMESTAMP
  WHERE shelter_id = $1 AND admin_id = $2 AND archived_at IS NULL
  RETURNING shelter_id`;

const REJECT_SHELTER_REQUESTS = `UPDATE relief_requests SET status = 'rejected'
  WHERE shelter_id = $1
    AND LOWER(status) IN ('waiting_stock', 'approved', 'partially_fulfilled')`;

module.exports = {
  LIST_SHELTERS,
  GET_SHELTER,
  INSERT_SHELTER,
  UPDATE_SHELTER,
  DELETE_SHELTER,
  REJECT_SHELTER_REQUESTS,
};
