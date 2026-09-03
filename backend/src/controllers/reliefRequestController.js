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
  LIST_ELIGIBLE_REQUESTS,
  GET_ELIGIBLE_REQUEST_ITEMS,
  LOCK_RELIEF_REQUEST,
  LOCK_REQUEST_ITEM,
  LOCK_REQUEST_ITEMS_ALL,
  UPDATE_DISPATCHED_INCREMENT,
  CREATE_DONATION_FOR_REQUEST,
  UPSERT_SHELTER_INVENTORY_TX,
} = require('../sqls/reliefRequestSqls');

const ALLOWED_STATUSES = ['pending', 'waiting_stock', 'approved', 'partially_fulfilled', 'rejected', 'fulfilled'];

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
    const enriched = itemsResult.rows.map((r) => ({ ...r, remaining: r.quantity_requested - r.quantity_dispatched }));
    const request = { ...result.rows[0], items: enriched };
    return res.json({ request, items: enriched });
  } catch (err) {
    console.error('[reliefRequests/get] error:', err);
    return res.status(500).json({ message: 'Failed to load relief request' });
  }
}

async function listEligibleRequests(req, res) {
  try {
    const result = await pool.query(LIST_ELIGIBLE_REQUESTS);
    const requests = [];
    for (const r of result.rows) {
      const itemsRes = await pool.query(GET_ELIGIBLE_REQUEST_ITEMS, [r.request_id]);
      const items = itemsRes.rows.map((it) => ({
        request_item_id: it.request_item_id,
        item_id: it.item_id,
        item_name: it.item_name,
        unit: it.unit,
        remaining: Number(it.remaining),
      }));
      if (items.length === 0) continue;
      requests.push({ request_id: r.request_id, shelter_id: r.shelter_id, shelter_name: r.shelter_name, items });
    }
    return res.json({ requests, relief_requests: requests });
  } catch (err) {
    console.error('[reliefRequests/listEligible] error:', err);
    return res.status(500).json({ message: 'Failed to load eligible requests' });
  }
}

async function donateToReliefRequest(req, res) {
  const requestId = integer(req.params.id);
  if (requestId === null) return res.status(400).json({ message: 'Invalid request id' });

  // Support both single item payload and items array
  let donations = [];
  if (Array.isArray(req.body.items)) {
    donations = req.body.items;
  } else {
    const itemId = integer(req.body.item_id);
    const qty = integer(req.body.quantity);
    if (itemId !== null && qty !== null) donations = [{ item_id: itemId, quantity: qty }];
    else if (req.body.item_id !== undefined || req.body.quantity !== undefined) {
      return res.status(400).json({ message: 'item_id and quantity are required' });
    } else {
      return res.status(400).json({ message: 'item_id and quantity or items array is required' });
    }
  }
  if (donations.length === 0) return res.status(400).json({ message: 'At least one donation item is required' });
  if (donations.length > 20) return res.status(400).json({ message: 'Maximum 20 items per donation' });

  const merged = new Map();
  for (const d of donations) {
    const itemId = integer(d.item_id);
    const qty = integer(d.quantity);
    if (itemId === null || qty === null || qty <= 0) {
      return res.status(400).json({ message: 'Each item requires valid item_id and positive quantity' });
    }
    merged.set(itemId, (merged.get(itemId) || 0) + qty);
  }
  const itemsToDonate = Array.from(merged, ([item_id, quantity]) => ({ item_id, quantity }));

  const donorId = req.user.user_id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lockedReq = await client.query(LOCK_RELIEF_REQUEST, [requestId]);
    if (!lockedReq.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Relief request not found' });
    }
    const rr = lockedReq.rows[0];
    const statusLower = String(rr.status || 'pending').toLowerCase();
    if (statusLower === 'rejected') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot donate to a rejected request' });
    }
    if (statusLower === 'fulfilled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot donate to a fulfilled request' });
    }

    const shelterId = rr.shelter_id;
    const createdDonations = [];
    const updatedItems = [];
    const shelterInventories = [];

    for (const { item_id, quantity } of itemsToDonate) {
      const lockedItem = await client.query(LOCK_REQUEST_ITEM, [requestId, item_id]);
      if (!lockedItem.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `Request item not found for item_id: ${item_id}` });
      }
      const ri = lockedItem.rows[0];
      const remaining = ri.quantity_requested - ri.quantity_dispatched;
      if (remaining <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Item ${item_id} has no remaining shortage` });
      }
      if (quantity > remaining) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Donation quantity ${quantity} exceeds remaining ${remaining} for item ${item_id}` });
      }

      const donationRes = await client.query(CREATE_DONATION_FOR_REQUEST, [donorId, shelterId, requestId, item_id, quantity]);
      createdDonations.push(donationRes.rows[0]);

      const updRes = await client.query(UPDATE_DISPATCHED_INCREMENT, [ri.request_item_id, requestId, quantity]);
      updatedItems.push(updRes.rows[0]);

      const invRes = await client.query(UPSERT_SHELTER_INVENTORY_TX, [shelterId, item_id, quantity]);
      shelterInventories.push(invRes.rows[0]);
    }

    // Check fulfillment: all items fulfilled?
    const allItems = await client.query(LOCK_REQUEST_ITEMS_ALL, [requestId]);
    const allFulfilled = allItems.rows.every((r) => r.quantity_dispatched >= r.quantity_requested);
    let fulfilledStatus = null;
    if (allFulfilled) {
      const upd = await client.query(UPDATE_REQUEST_STATUS, [requestId, 'fulfilled']);
      fulfilledStatus = upd.rows[0].status;
    }

    await client.query('COMMIT');
    return res.status(201).json({
      donations: createdDonations,
      updated_items: updatedItems,
      shelter_inventories: shelterInventories,
      fulfilled: allFulfilled,
      status: fulfilledStatus,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[reliefRequests/donate] error:', err);
    return res.status(500).json({ message: 'Failed to process donation' });
  } finally {
    client.release();
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
  listEligibleRequests,
  donateToReliefRequest,
};
