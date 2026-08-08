const FIND_LOCATION = `SELECT location_id FROM locations
  WHERE division = $1 AND district = $2
    AND upazila IS NOT DISTINCT FROM $3
    AND union_name IS NOT DISTINCT FROM $4
  LIMIT 1`;

const INSERT_LOCATION = `INSERT INTO locations (division, district, upazila, union_name)
  VALUES ($1, $2, $3, $4) RETURNING location_id`;

const INSERT_DISASTER = `INSERT INTO disasters (title, status, start_date, created_by_admin_id)
  VALUES ($1, 'ACTIVE', CURRENT_DATE, $2)
  RETURNING disaster_id, title, status, start_date`;

const INSERT_DISASTER_LOCATION = `INSERT INTO disaster_locations (disaster_id, location_id) VALUES ($1, $2)`;

const LIST_DISASTERS = `SELECT d.disaster_id, d.title, d.status, d.start_date,
        COALESCE(json_agg(json_build_object(
            'location_id', l.location_id,
            'division', l.division,
            'district', l.district,
            'upazila', l.upazila,
            'union_name', l.union_name
        ) ORDER BY l.location_id) FILTER (WHERE l.location_id IS NOT NULL), '[]') AS locations
  FROM disasters d
  LEFT JOIN disaster_locations dl ON dl.disaster_id = d.disaster_id
  LEFT JOIN locations l ON l.location_id = dl.location_id
  GROUP BY d.disaster_id
  ORDER BY d.start_date DESC, d.disaster_id DESC`;

const UPDATE_DISASTER_STATUS = `UPDATE disasters SET status = $1 WHERE disaster_id = $2
  RETURNING disaster_id, title, status, start_date`;

module.exports = {
  FIND_LOCATION,
  INSERT_LOCATION,
  INSERT_DISASTER,
  INSERT_DISASTER_LOCATION,
  LIST_DISASTERS,
  UPDATE_DISASTER_STATUS,
};
