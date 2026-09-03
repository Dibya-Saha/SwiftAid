const pool = require('../db');
const {
  LIST_ITEMS,
  GET_ITEM,
  INSERT_ITEM,
  UPDATE_ITEM,
  DELETE_ITEM,
} = require('../sqls/itemSqls');

const ITEM_UNITS = ['kg', 'g', 'litre', 'ml', 'piece', 'pack', 'box', 'bag', 'bottle', 'can', 'set', 'pair', 'tablet'];
const ITEM_CATEGORIES = ['food', 'water', 'medical', 'hygiene', 'clothing', 'shelter', 'rescue', 'logistics', 'other'];

function readItemInput(body) {
  return {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    category: typeof body.category === 'string' ? body.category.trim().toLowerCase() : '',
    unit: typeof body.unit === 'string' ? body.unit.trim() : '',
  };
}

function validateItemInput(input) {
  if (!input.name || !input.unit) return 'Name and unit are required';
  if (!ITEM_UNITS.includes(input.unit)) return `unit must be one of: ${ITEM_UNITS.join(', ')}`;
  if (!ITEM_CATEGORIES.includes(input.category)) return `category must be one of: ${ITEM_CATEGORIES.join(', ')}`;
  return null;
}

async function listItems(req, res) {
  try {
    const result = await pool.query(LIST_ITEMS);
    return res.json({ items: result.rows });
  } catch (err) {
    console.error('[items/list] error:', err);
    return res.status(500).json({ message: 'Failed to load items' });
  }
}

async function getItem(req, res) {
  try {
    const result = await pool.query(GET_ITEM, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Item not found' });
    return res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('[items/get] error:', err);
    return res.status(500).json({ message: 'Failed to load item' });
  }
}

async function createItem(req, res) {
  const input = readItemInput(req.body);
  const validationError = validateItemInput(input);
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const result = await pool.query(INSERT_ITEM, [input.name, input.category || null, input.unit]);
    return res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    console.error('[items/create] error:', err);
    return res.status(500).json({ message: 'Failed to create item' });
  }
}

async function updateItem(req, res) {
  const input = readItemInput(req.body);
  const validationError = validateItemInput(input);
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const result = await pool.query(UPDATE_ITEM, [input.name, input.category || null, input.unit, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Item not found' });
    return res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('[items/update] error:', err);
    return res.status(500).json({ message: 'Failed to update item' });
  }
}

async function deleteItem(req, res) {
  try {
    const result = await pool.query(DELETE_ITEM, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Item not found' });
    return res.json({ message: 'Item archived' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ message: 'Item cannot be archived because another record references it' });
    }
    console.error('[items/delete] error:', err);
    return res.status(500).json({ message: 'Failed to delete item' });
  }
}

module.exports = { listItems, getItem, createItem, updateItem, deleteItem, ITEM_UNITS, ITEM_CATEGORIES };
