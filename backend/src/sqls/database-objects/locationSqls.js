// Location lookup/creation function SQL.
// Inspectable copy of backend/migrations/026_get_or_create_location.sql.
// Used by shelter, warehouse, and disaster creation queries through
// src/sqls/locationSqls.js.

const CREATE_GET_OR_CREATE_LOCATION_FUNCTION = `CREATE OR REPLACE FUNCTION get_or_create_location(
  p_division VARCHAR,
  p_district VARCHAR,
  p_upazila VARCHAR,
  p_union_name VARCHAR
)
RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE
  v_location_id INT;
BEGIN
  SELECT location_id INTO v_location_id
  FROM locations
  WHERE division = p_division
    AND district = p_district
    AND upazila IS NOT DISTINCT FROM p_upazila
    AND union_name IS NOT DISTINCT FROM p_union_name
  LIMIT 1;

  IF v_location_id IS NOT NULL THEN
    RETURN v_location_id;
  END IF;

  INSERT INTO locations (division, district, upazila, union_name)
  VALUES (p_division, p_district, p_upazila, p_union_name)
  RETURNING location_id INTO v_location_id;

  RETURN v_location_id;
END;
$$;`;

const GET_OR_CREATE_LOCATION = `SELECT get_or_create_location(
    $1::varchar, $2::varchar, $3::varchar, $4::varchar
  ) AS location_id`;

const DROP_GET_OR_CREATE_LOCATION_FUNCTION = `DROP FUNCTION IF EXISTS get_or_create_location(VARCHAR, VARCHAR, VARCHAR, VARCHAR);`;

module.exports = {
  CREATE_GET_OR_CREATE_LOCATION_FUNCTION,
  GET_OR_CREATE_LOCATION,
  DROP_GET_OR_CREATE_LOCATION_FUNCTION,
};
