const LIST_ITEMS = `SELECT item_id, name, category, unit
  FROM items
  WHERE archived_at IS NULL
  ORDER BY item_id DESC`;

const GET_ITEM = `SELECT item_id, name, category, unit
  FROM items
  WHERE item_id = $1 AND archived_at IS NULL`;

const INSERT_ITEM = `INSERT INTO items (name, category, unit)
  VALUES ($1, $2, $3)
  RETURNING item_id, name, category, unit`;

const UPDATE_ITEM = `UPDATE items
  SET name = $1, category = $2, unit = $3
  WHERE item_id = $4 AND archived_at IS NULL
  RETURNING item_id, name, category, unit`;

const DELETE_ITEM = `UPDATE items SET archived_at = CURRENT_TIMESTAMP
  WHERE item_id = $1 AND archived_at IS NULL
  RETURNING item_id`;

module.exports = { LIST_ITEMS, GET_ITEM, INSERT_ITEM, UPDATE_ITEM, DELETE_ITEM };
