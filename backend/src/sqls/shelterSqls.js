const FIND_LOCATION = `SELECT location_id FROM locations
  WHERE division = $1 AND district = $2
    AND upazila IS NOT DISTINCT FROM $3
    AND union_name IS NOT DISTINCT FROM $4
  LIMIT 1`;

const INSERT_LOCATION = `INSERT INTO locations (division, district, upazila, union_name)
  VALUES ($1, $2, $3, $4)
  RETURNING location_id`;

const LIST_SHELTERS = `SELECT
    s.shelter_id, s.name, s.address, s.capacity, s.admin_id,
    l.location_id, l.division, l.district, l.upazila, l.union_name
  FROM shelters s
  JOIN locations l ON l.location_id = s.location_id
  ORDER BY s.shelter_id DESC`;

const GET_SHELTER = `SELECT
    s.shelter_id, s.name, s.address, s.capacity, s.admin_id,
    l.location_id, l.division, l.district, l.upazila, l.union_name
  FROM shelters s
  JOIN locations l ON l.location_id = s.location_id
  WHERE s.shelter_id = $1`;

const INSERT_SHELTER = `INSERT INTO shelters (name, address, capacity, admin_id, location_id)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING shelter_id, name, address, capacity, admin_id, location_id`;

const UPDATE_SHELTER = `UPDATE shelters
  SET name = $1, address = $2, capacity = $3, location_id = $4
  WHERE shelter_id = $5
  RETURNING shelter_id, name, address, capacity, admin_id, location_id`;

const DELETE_SHELTER = `DELETE FROM shelters
  WHERE shelter_id = $1
  RETURNING shelter_id`;

module.exports = {
  FIND_LOCATION,
  INSERT_LOCATION,
  LIST_SHELTERS,
  GET_SHELTER,
  INSERT_SHELTER,
  UPDATE_SHELTER,
  DELETE_SHELTER,
};
