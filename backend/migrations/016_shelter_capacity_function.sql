-- Computed remaining shelter capacity for victim assignment.
-- Inspectable copy: backend/src/sqls/shelterCapacitySqls.js

CREATE OR REPLACE FUNCTION shelter_remaining_capacity(p_shelter_id INT)
RETURNS INT
LANGUAGE sql
STABLE AS $$
  SELECT GREATEST(s.capacity - COUNT(v.victim_id) FILTER (WHERE v.archived_at IS NULL), 0)
  FROM shelters s
  LEFT JOIN victims v ON v.shelter_id = s.shelter_id
  WHERE s.shelter_id = p_shelter_id
    AND s.archived_at IS NULL
  GROUP BY s.capacity;
$$;
