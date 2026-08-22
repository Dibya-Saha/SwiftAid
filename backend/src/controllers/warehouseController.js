const pool = require('../db');
const {
  FIND_LOCATION,
  INSERT_LOCATION,
  LIST_WAREHOUSES,
  GET_WAREHOUSE,
  INSERT_WAREHOUSE,
  UPDATE_WAREHOUSE,
  DELETE_WAREHOUSE,
} = require('../sqls/warehouseSqls');

function readWarehouseInput(body) {
  const { name, division, district, upazila, union: unionName, union_name } = body;
  return {
    name: typeof name === 'string' ? name.trim() : '',
    division: typeof division === 'string' ? division.trim() : '',
    district: typeof district === 'string' ? district.trim() : '',
    upazila: typeof upazila === 'string' ? upazila.trim() : '',
    unionName: typeof (unionName || union_name) === 'string' ? (unionName || union_name).trim() : '',
  };
}

function validateWarehouseInput(input) {
  if (!input.name || !input.division || !input.district) {
    return 'Name, division, and district are required';
  }
  return null;
}

async function resolveLocation(client, input) {
  const values = [input.division, input.district, input.upazila || null, input.unionName || null];
  const existing = await client.query(FIND_LOCATION, values);
  if (existing.rows[0]) return existing.rows[0].location_id;
  const created = await client.query(INSERT_LOCATION, values);
  return created.rows[0].location_id;
}

async function listWarehouses(req, res) {
  try {
    const result = await pool.query(LIST_WAREHOUSES);
    return res.json({ warehouses: result.rows });
  } catch (err) {
    console.error('[warehouses/list] error:', err);
    return res.status(500).json({ message: 'Failed to load warehouses' });
  }
}

async function getWarehouse(req, res) {
  try {
    const result = await pool.query(GET_WAREHOUSE, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Warehouse not found' });
    return res.json({ warehouse: result.rows[0] });
  } catch (err) {
    console.error('[warehouses/get] error:', err);
    return res.status(500).json({ message: 'Failed to load warehouse' });
  }
}

async function createWarehouse(req, res) {
  const input = readWarehouseInput(req.body);
  const validationError = validateWarehouseInput(input);
  if (validationError) return res.status(400).json({ message: validationError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locationId = await resolveLocation(client, input);
    const result = await client.query(INSERT_WAREHOUSE, [input.name, req.user.user_id, locationId]);
    await client.query('COMMIT');
    return res.status(201).json({ warehouse: { ...result.rows[0], location_id: locationId } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[warehouses/create] error:', err);
    return res.status(500).json({ message: 'Failed to create warehouse' });
  } finally {
    client.release();
  }
}

async function updateWarehouse(req, res) {
  const input = readWarehouseInput(req.body);
  const validationError = validateWarehouseInput(input);
  if (validationError) return res.status(400).json({ message: validationError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locationId = await resolveLocation(client, input);
    const result = await client.query(UPDATE_WAREHOUSE, [input.name, locationId, req.params.id]);
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    await client.query('COMMIT');
    return res.json({ warehouse: { ...result.rows[0], location_id: locationId } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[warehouses/update] error:', err);
    return res.status(500).json({ message: 'Failed to update warehouse' });
  } finally {
    client.release();
  }
}

async function deleteWarehouse(req, res) {
  try {
    const result = await pool.query(DELETE_WAREHOUSE, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Warehouse not found' });
    return res.json({ message: 'Warehouse deleted' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ message: 'Warehouse cannot be deleted while inventory, donations, or distributions reference it' });
    }
    console.error('[warehouses/delete] error:', err);
    return res.status(500).json({ message: 'Failed to delete warehouse' });
  }
}

module.exports = { listWarehouses, getWarehouse, createWarehouse, updateWarehouse, deleteWarehouse };
