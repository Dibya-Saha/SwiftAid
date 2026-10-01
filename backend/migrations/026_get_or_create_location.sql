-- Reuse an existing administrative location or create it once.
-- Inspectable copy: backend/src/sqls/database-objects/locationSqls.js

CREATE OR REPLACE FUNCTION get_or_create_location(
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
$$;
