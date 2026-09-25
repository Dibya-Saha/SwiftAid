// Remaining shelter capacity function SQL.
// Inspectable copy of backend/migrations/016_shelter_capacity_function.sql.
// Used in production by LIST_SHELTERS and GET_SHELTER in shelterSqls.js via
// shelter_remaining_capacity(shelter_id).

const CREATE_SHELTER_CAPACITY_FUNCTION = `CREATE OR REPLACE FUNCTION shelter_remaining_capacity(p_shelter_id INT)
RETURNS INT
LANGUAGE sql
STABLE AS $$
  SELECT GREATEST(s.capacity - COUNT(v.victim_id) FILTER (WHERE v.archived_at IS NULL), 0)
  FROM shelters s
  LEFT JOIN victims v ON v.shelter_id = s.shelter_id
  WHERE s.shelter_id = p_shelter_id
    AND s.archived_at IS NULL
  GROUP BY s.capacity;
$$;`;

const DROP_SHELTER_CAPACITY_FUNCTION = `DROP FUNCTION IF EXISTS shelter_remaining_capacity(INT);`;

module.exports = {
  CREATE_SHELTER_CAPACITY_FUNCTION,
  DROP_SHELTER_CAPACITY_FUNCTION,
};
