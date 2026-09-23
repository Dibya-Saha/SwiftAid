const pool = require('../db');
const {
  FIND_LOCATION,
  INSERT_LOCATION,
  LIST_SHELTERS,
  GET_SHELTER,
  INSERT_SHELTER,
  UPDATE_SHELTER,
  DELETE_SHELTER,
  REJECT_SHELTER_REQUESTS,
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
    latitude: body.latitude === '' || body.latitude === undefined ? null : Number(body.latitude),
    longitude: body.longitude === '' || body.longitude === undefined ? null : Number(body.longitude),
  };
}

function validateShelterInput(input) {
  if (!input.name || !input.division || !input.district) {
    return 'Name, division, and district are required';
  }
  if (!Number.isInteger(input.capacity) || input.capacity <= 0) {
    return 'Capacity must be a positive integer';
  }
  if ((input.latitude === null) !== (input.longitude === null) || !Number.isFinite(input.latitude) || !Number.isFinite(input.longitude) || input.latitude < -90 || input.latitude > 90 || input.longitude < -180 || input.longitude > 180) {
    return 'Latitude and longitude must be valid coordinates provided together';
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
      input.latitude,
      input.longitude,
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
      input.latitude,
      input.longitude,
      req.params.id,
      req.user.user_id,
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(DELETE_SHELTER, [req.params.id, req.user.user_id]);
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Shelter not found' });
    }
    // Stranded open requests can never be fulfilled once their shelter is
    // gone, so close them in the same transaction instead of orphaning them.
    const rejected = await client.query(REJECT_SHELTER_REQUESTS, [req.params.id]);
    await client.query('COMMIT');
    return res.json({ message: 'Shelter archived', rejected_requests: rejected.rowCount });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') return res.status(409).json({ message: 'Shelter cannot be deleted because another record references it' });
    console.error('[shelters/delete] error:', err);
    return res.status(500).json({ message: 'Failed to delete shelter' });
  } finally {
    client.release();
  }
}

module.exports = { listShelters, getShelter, createShelter, updateShelter, deleteShelter };
