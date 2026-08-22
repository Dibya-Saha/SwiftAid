const pool = require('../db');
const {
  FIND_LOCATION,
  INSERT_LOCATION,
  LIST_SHELTERS,
  GET_SHELTER,
  INSERT_SHELTER,
  UPDATE_SHELTER,
  DELETE_SHELTER,
} = require('../sqls/shelterSqls');

function readShelterInput(body) {
  const { name, address, capacity, division, district, upazila, union: unionName, union_name } = body;
  return {
    name: typeof name === 'string' ? name.trim() : '',
    address: typeof address === 'string' ? address.trim() : '',
    capacity: Number(capacity),
    division: typeof division === 'string' ? division.trim() : '',
    district: typeof district === 'string' ? district.trim() : '',
    upazila: typeof upazila === 'string' ? upazila.trim() : '',
    unionName: typeof (unionName || union_name) === 'string' ? (unionName || union_name).trim() : '',
  };
}

function validateShelterInput(input) {
  if (!input.name || !input.division || !input.district) {
    return 'Name, division, and district are required';
  }
  if (!Number.isInteger(input.capacity) || input.capacity <= 0) {
    return 'Capacity must be a positive integer';
  }
  return null;
}

async function resolveLocation(client, input) {
  const values = [
    input.division,
    input.district,
    input.upazila || null,
    input.unionName || null,
  ];
  const existing = await client.query(FIND_LOCATION, values);
  if (existing.rows[0]) return existing.rows[0].location_id;
  const created = await client.query(INSERT_LOCATION, values);
  return created.rows[0].location_id;
}

async function listShelters(req, res) {
  try {
    const result = await pool.query(LIST_SHELTERS);
    return res.json({ shelters: result.rows });
  } catch (err) {
    console.error('[shelters/list] error:', err);
    return res.status(500).json({ message: 'Failed to load shelters' });
  }
}

async function getShelter(req, res) {
  try {
    const result = await pool.query(GET_SHELTER, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Shelter not found' });
    return res.json({ shelter: result.rows[0] });
  } catch (err) {
    console.error('[shelters/get] error:', err);
    return res.status(500).json({ message: 'Failed to load shelter' });
  }
}

async function createShelter(req, res) {
  const input = readShelterInput(req.body);
  const validationError = validateShelterInput(input);
  if (validationError) return res.status(400).json({ message: validationError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locationId = await resolveLocation(client, input);
    const result = await client.query(INSERT_SHELTER, [
      input.name,
      input.address || null,
      input.capacity,
      req.user.user_id,
      locationId,
    ]);
    await client.query('COMMIT');
    return res.status(201).json({ shelter: { ...result.rows[0], location_id: locationId } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[shelters/create] error:', err);
    return res.status(500).json({ message: 'Failed to create shelter' });
  } finally {
    client.release();
  }
}

async function updateShelter(req, res) {
  const input = readShelterInput(req.body);
  const validationError = validateShelterInput(input);
  if (validationError) return res.status(400).json({ message: validationError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locationId = await resolveLocation(client, input);
    const result = await client.query(UPDATE_SHELTER, [
      input.name,
      input.address || null,
      input.capacity,
      locationId,
      req.params.id,
    ]);
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Shelter not found' });
    }
    await client.query('COMMIT');
    return res.json({ shelter: { ...result.rows[0], location_id: locationId } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[shelters/update] error:', err);
    return res.status(500).json({ message: 'Failed to update shelter' });
  } finally {
    client.release();
  }
}

async function deleteShelter(req, res) {
  try {
    const result = await pool.query(DELETE_SHELTER, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Shelter not found' });
    return res.json({ message: 'Shelter deleted' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ message: 'Shelter cannot be deleted while victims or requests reference it' });
    }
    console.error('[shelters/delete] error:', err);
    return res.status(500).json({ message: 'Failed to delete shelter' });
  }
}

module.exports = { listShelters, getShelter, createShelter, updateShelter, deleteShelter };
