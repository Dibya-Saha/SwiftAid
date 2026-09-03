const LIST_VICTIMS = `SELECT
    v.victim_id, v.full_name, v.date_of_birth, v.gender,
    v.priority_level, v.status, v.disaster_id, v.shelter_id,
    d.title AS disaster_title,
    s.name AS shelter_name,
    s.capacity AS shelter_capacity,
    COALESCE((
      SELECT COUNT(*)
      FROM victims occupied
       WHERE occupied.shelter_id = s.shelter_id
         AND occupied.archived_at IS NULL
    ), 0) AS shelter_occupied,
    CASE
      WHEN s.shelter_id IS NULL THEN 'unassigned'
      WHEN (
        SELECT COUNT(*)
        FROM victims occupied
        WHERE occupied.shelter_id = s.shelter_id
      ) >= s.capacity THEN 'full'
      ELSE 'available'
    END AS shelter_availability
  FROM victims v
  JOIN disasters d ON d.disaster_id = v.disaster_id
  LEFT JOIN shelters s ON s.shelter_id = v.shelter_id
  WHERE v.archived_at IS NULL
  ORDER BY v.victim_id DESC`;

const GET_VICTIM = `SELECT
    v.victim_id, v.full_name, v.date_of_birth, v.gender,
    v.priority_level, v.status, v.disaster_id, v.shelter_id,
    d.title AS disaster_title,
    s.name AS shelter_name,
    s.capacity AS shelter_capacity,
     COALESCE((SELECT COUNT(*) FROM victims occupied WHERE occupied.shelter_id = s.shelter_id AND occupied.archived_at IS NULL), 0) AS shelter_occupied,
    CASE
      WHEN s.shelter_id IS NULL THEN 'unassigned'
         WHEN (SELECT COUNT(*) FROM victims occupied WHERE occupied.shelter_id = s.shelter_id AND occupied.archived_at IS NULL) >= s.capacity THEN 'full'
      ELSE 'available'
    END AS shelter_availability
  FROM victims v
  JOIN disasters d ON d.disaster_id = v.disaster_id
  LEFT JOIN shelters s ON s.shelter_id = v.shelter_id
  WHERE v.victim_id = $1 AND v.archived_at IS NULL`;

const FIND_DISASTER = `SELECT disaster_id FROM disasters WHERE disaster_id = $1`;
const LOCK_SHELTER = `SELECT shelter_id, capacity FROM shelters WHERE shelter_id = $1 AND archived_at IS NULL FOR UPDATE`;
const COUNT_SHELTER_VICTIMS = `SELECT COUNT(*)::int AS occupied
  FROM victims
  WHERE shelter_id = $1 AND victim_id <> $2 AND archived_at IS NULL`;

const INSERT_VICTIM = `INSERT INTO victims
    (full_name, date_of_birth, gender, priority_level, status, disaster_id, shelter_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING victim_id, full_name, date_of_birth, gender, priority_level, status, disaster_id, shelter_id`;

const FIND_VICTIM = `SELECT victim_id, shelter_id FROM victims WHERE victim_id = $1 AND archived_at IS NULL FOR UPDATE`;

const UPDATE_VICTIM = `UPDATE victims SET
    full_name = $1, date_of_birth = $2, gender = $3,
    priority_level = $4, status = $5, disaster_id = $6, shelter_id = $7
  WHERE victim_id = $8 AND archived_at IS NULL
  RETURNING victim_id, full_name, date_of_birth, gender, priority_level, status, disaster_id, shelter_id`;

const DELETE_VICTIM = `UPDATE victims SET archived_at = CURRENT_TIMESTAMP WHERE victim_id = $1 AND archived_at IS NULL RETURNING victim_id`;

module.exports = {
  LIST_VICTIMS,
  GET_VICTIM,
  FIND_DISASTER,
  LOCK_SHELTER,
  COUNT_SHELTER_VICTIMS,
  INSERT_VICTIM,
  FIND_VICTIM,
  UPDATE_VICTIM,
  DELETE_VICTIM,
};
