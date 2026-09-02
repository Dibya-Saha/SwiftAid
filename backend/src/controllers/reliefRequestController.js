const pool = require('../db');
const {
  FIND_SHELTER,
  FIND_ITEM,
  CREATE_RELIEF_REQUEST,
  CREATE_REQUEST_ITEM,
  LIST_RELIEF_REQUESTS,
  GET_RELIEF_REQUEST,
  GET_REQUEST_ITEMS,
  FIND_RELIEF_REQUEST,
  UPDATE_REQUEST_STATUS,
  FIND_REQUEST_ITEM,
  FIND_REQUEST_ITEM_BY_ITEM,
  UPDATE_DISPATCHED,
} = require('../sqls/reliefRequestSqls');

const ALLOWED_STATUSES = ['pending', 'approved', 'rejected', 'fulfilled'];

function integer(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

async function createReliefRequest(req, res) {
  const shelterId = integer(req.body.shelter_id);
  if (shelterId === null) {
    return res.status(400).json({ message: 'shelter_id is required and must be an integer' });
  }

  const rawItems = req.body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return res.status(400).json({ message: 'At least one item is required' });
  }
  if (rawItems.length > 20) {
    return res.status(400).json({ message: 'Maximum 20 items per request' });
  }

  // Merge duplicate item_id by summing quantity_requested
  const merged = new Map();
  for (const raw of rawItems) {
    const itemId = integer(raw.item_id);
    const qty = integer(raw.quantity_requested);
    if (itemId === null || qty === null || qty <= 0) {
      return res.status(400).json({ message: 'Each item requires a valid item_id and a positive integer quantity_requested' });
    }
    merged.set(itemId, (merged.get(itemId) || 0) + qty);
  }
  if (merged.size === 0) {
    return res.status(400).json({ message: 'At least one item is required' });
  }
  if (merged.size > 20) {
    return res.status(400).json({ message: 'Maximum 20 unique items per request' });
  }
  const items = Array.from(merged, ([item_id, quantity_requested]) => ({ item_id, quantity_requested }));

  const requestedByAdminId = req.user.user_id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const shelter = await client.query(FIND_SHELTER, [shelterId]);
    if (!shelter.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Shelter not found' });
    }

    for (const { item_id } of items) {
      const item = await client.query(FIND_ITEM, [item_id]);
      if (!item.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `Item not found: ${item_id}` });
      }
    }

    const reqResult = await client.query(CREATE_RELIEF_REQUEST, [shelterId, requestedByAdminId]);
    const created = reqResult.rows[0];

    const insertedItems = [];
    for (const { item_id, quantity_requested } of items) {
      const r = await client.query(CREATE_REQUEST_ITEM, [created.request_id, item_id, quantity_requested]);
      insertedItems.push(r.rows[0]);
    }

    await client.query('COMMIT');

    // Fetch enriched items for response
    const enriched = await pool.query(GET_REQUEST_ITEMS, [created.request_id]);
    const shelterInfo = shelter.rows[0];
    return res.status(201).json({
      request: { ...created, shelter_name: shelterInfo.name, items: enriched.rows },
      request_id: created.request_id,
      items: enriched.rows,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[reliefRequests/create] error:', err);
    return res.status(500).json({ message: 'Failed to create relief request' });
  } finally {
    client.release();
  }
}

async function listReliefRequests(req, res) {
  try {
    const result = await pool.query(LIST_RELIEF_REQUESTS);
    return res.json({ requests: result.rows, relief_requests: result.rows });
  } catch (err) {
    console.error('[reliefRequests/list] error:', err);
    return res.status(500).json({ message: 'Failed to load relief requests' });
  }
}

async function getReliefRequest(req, res) {
  const id = integer(req.params.id);
  if (id === null) return res.status(400).json({ message: 'Invalid request id' });
  try {
    const result = await pool.query(GET_RELIEF_REQUEST, [id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Relief request not found' });
    const itemsResult = await pool.query(GET_REQUEST_ITEMS, [id]);
    const request = { ...result.rows[0], items: itemsResult.rows };
    return res.json({ request, items: itemsResult.rows });
  } catch (err) {
    console.error('[reliefRequests/get] error:', err);
    return res.status(500).json({ message: 'Failed to load relief request' });
  }
}

async function updateReliefRequestStatus(req, res) {
  const id = integer(req.params.id);
  if (id === null) return res.status(400).json({ message: 'Invalid request id' });
  const status = String(req.body.status || '').toLowerCase();
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
  }
  try {
    const existing = await pool.query(FIND_RELIEF_REQUEST, [id]);
    if (!existing.rows[0]) return res.status(404).json({ message: 'Relief request not found' });
    const result = await pool.query(UPDATE_REQUEST_STATUS, [id, status]);
    return res.json({ request: result.rows[0] });
  } catch (err) {
    console.error('[reliefRequests/updateStatus] error:', err);
    return res.status(500).json({ message: 'Failed to update status' });
  }
}

async function updateDispatchedQuantity(req, res) {
  const requestId = integer(req.params.id);
  const itemIdParam = integer(req.params.itemId);
  if (requestId === null || itemIdParam === null) {
    return res.status(400).json({ message: 'Invalid request id or item id' });
  }
  const quantityDispatched = integer(req.body.quantity_dispatched);
  if (quantityDispatched === null || quantityDispatched < 0) {
    return res.status(400).json({ message: 'quantity_dispatched must be a non-negative integer' });
  }
  try {
    const reqExists = await pool.query(FIND_RELIEF_REQUEST, [requestId]);
    if (!reqExists.rows[0]) return res.status(404).json({ message: 'Relief request not found' });

    // itemId param may refer to request_item_id or item_id. Spec says /items/:itemId
    // We support both: first try request_item_id, then fallback to item_id lookup.
    let requestItem = await pool.query(FIND_REQUEST_ITEM, [itemIdParam, requestId]);
    if (!requestItem.rows[0]) {
      requestItem = await pool.query(FIND_REQUEST_ITEM_BY_ITEM, [requestId, itemIdParam]);
    }
    if (!requestItem.rows[0]) return res.status(404).json({ message: 'Request item not found' });

    const item = requestItem.rows[0];
    if (quantityDispatched > item.quantity_requested) {
      return res.status(400).json({ message: 'quantity_dispatched must not exceed quantity_requested' });
    }

    const result = await pool.query(UPDATE_DISPATCHED, [item.request_item_id, requestId, quantityDispatched]);
    return res.json({ request_item: result.rows[0], item: result.rows[0] });
  } catch (err) {
    console.error('[reliefRequests/updateDispatched] error:', err);
    return res.status(500).json({ message: 'Failed to update dispatched quantity' });
  }
}

module.exports = {
  createReliefRequest,
  listReliefRequests,
  getReliefRequest,
  updateReliefRequestStatus,
  updateDispatchedQuantity,
};
