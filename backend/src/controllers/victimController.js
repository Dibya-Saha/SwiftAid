const pool = require('../db');
const {
  LIST_VICTIMS,
  GET_VICTIM,
  FIND_DISASTER,
  LOCK_SHELTER,
  COUNT_SHELTER_VICTIMS,
  INSERT_VICTIM,
  FIND_VICTIM,
  UPDATE_VICTIM,
  DELETE_VICTIM,
} = require('../sqls/victimSqls');

const PRIORITIES = ['low', 'normal', 'high', 'critical'];
const STATUSES = ['registered', 'sheltered', 'relocated', 'safe'];

function readVictimInput(body) {
  const numberOrNull = (value) => value === '' || value === null || value === undefined ? null : Number(value);
  return {
    fullName: typeof body.full_name === 'string' ? body.full_name.trim() : '',
    dateOfBirth: body.date_of_birth || null,
    gender: typeof body.gender === 'string' ? body.gender.trim() : '',
    priority: typeof body.priority_level === 'string' ? body.priority_level.toLowerCase() : 'normal',
    status: typeof body.status === 'string' ? body.status.toLowerCase() : 'registered',
    disasterId: numberOrNull(body.disaster_id),
    shelterId: numberOrNull(body.shelter_id),
  };
}

function validateVictimInput(input) {
  if (!input.fullName || !Number.isInteger(input.disasterId)) return 'Full name and disaster are required';
  if (input.shelterId !== null && !Number.isInteger(input.shelterId)) return 'shelter_id must be an integer';
  if (!PRIORITIES.includes(input.priority)) return `priority_level must be one of: ${PRIORITIES.join(', ')}`;
  if (!STATUSES.includes(input.status)) return `status must be one of: ${STATUSES.join(', ')}`;
  return null;
}

async function ensureCapacity(client, shelterId, victimId) {
  if (shelterId === null) return;
  const shelter = await client.query(LOCK_SHELTER, [shelterId]);
  if (!shelter.rows[0]) {
    const error = new Error('Shelter not found');
    error.statusCode = 404;
    throw error;
  }
  const count = await client.query(COUNT_SHELTER_VICTIMS, [shelterId, victimId || 0]);
  if (count.rows[0].occupied >= shelter.rows[0].capacity) {
    const error = new Error('Shelter is at full capacity');
    error.statusCode = 409;
    throw error;
  }
}

async function ensureDisaster(client, disasterId) {
  const result = await client.query(FIND_DISASTER, [disasterId]);
  if (!result.rows[0]) {
    const error = new Error('Disaster not found');
    error.statusCode = 404;
    throw error;
  }
}

async function listVictims(req, res) {
  try {
    const result = await pool.query(LIST_VICTIMS);
    return res.json({ victims: result.rows });
  } catch (err) {
    console.error('[victims/list] error:', err);
    return res.status(500).json({ message: 'Failed to load victims' });
  }
}

async function getVictim(req, res) {
  try {
    const result = await pool.query(GET_VICTIM, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Victim not found' });
    return res.json({ victim: result.rows[0] });
  } catch (err) {
    console.error('[victims/get] error:', err);
    return res.status(500).json({ message: 'Failed to load victim' });
  }
}

async function createVictim(req, res) {
  const input = readVictimInput(req.body);
  const validationError = validateVictimInput(input);
  if (validationError) return res.status(400).json({ message: validationError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureDisaster(client, input.disasterId);
    await ensureCapacity(client, input.shelterId, null);
    const result = await client.query(INSERT_VICTIM, [
      input.fullName,
      input.dateOfBirth,
      input.gender || null,
      input.priority,
      input.status,
      input.disasterId,
      input.shelterId,
    ]);
    await client.query('COMMIT');
    return res.status(201).json({ victim: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    console.error('[victims/create] error:', err);
    return res.status(500).json({ message: 'Failed to create victim' });
  } finally {
    client.release();
  }
}

async function updateVictim(req, res) {
  const input = readVictimInput(req.body);
  const validationError = validateVictimInput(input);
  if (validationError) return res.status(400).json({ message: validationError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(FIND_VICTIM, [req.params.id]);
    if (!current.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Victim not found' });
    }
    await ensureDisaster(client, input.disasterId);
    await ensureCapacity(client, input.shelterId, Number(req.params.id));
    const result = await client.query(UPDATE_VICTIM, [
      input.fullName,
      input.dateOfBirth,
      input.gender || null,
      input.priority,
      input.status,
      input.disasterId,
      input.shelterId,
      req.params.id,
    ]);
    await client.query('COMMIT');
    return res.json({ victim: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    console.error('[victims/update] error:', err);
    return res.status(500).json({ message: 'Failed to update victim' });
  } finally {
    client.release();
  }
}

async function deleteVictim(req, res) {
  try {
    const result = await pool.query(DELETE_VICTIM, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Victim not found' });
    return res.json({ message: 'Victim deleted' });
  } catch (err) {
    console.error('[victims/delete] error:', err);
    return res.status(500).json({ message: 'Failed to delete victim' });
  }
}

module.exports = { listVictims, getVictim, createVictim, updateVictim, deleteVictim };
