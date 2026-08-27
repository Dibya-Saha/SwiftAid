const pool = require('../db');
const {
  CREATE_DONATION,
  FIND_WAREHOUSE,
  FIND_ITEM,
  UPSERT_INVENTORY,
  LIST_MY_DONATIONS,
  LIST_DONATIONS,
  GET_DONATION,
} = require('../sqls/donationSqls');

function integer(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function readDonationItems(body) {
  if (Array.isArray(body.items)) return body.items;

  const itemId = integer(body.item_id);
  const quantity = integer(body.quantity);
  if (itemId === null || quantity === null) return null;

  return [{ item_id: itemId, quantity }];
}

function validateDonationItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return 'At least one item is required';
  }
  if (rawItems.length > 20) return 'Maximum 20 items per donation';

  const mergedItems = new Map();
  for (const rawItem of rawItems) {
    const itemId = integer(rawItem.item_id);
    const quantity = integer(rawItem.quantity);
    if (itemId === null || quantity === null || quantity <= 0) {
      return 'Each item requires a valid item_id and a positive integer quantity';
    }
    mergedItems.set(itemId, (mergedItems.get(itemId) || 0) + quantity);
  }

  if (mergedItems.size > 20) return 'Maximum 20 unique items per donation';
  return Array.from(mergedItems, ([item_id, quantity]) => ({ item_id, quantity }));
}

async function createDonation(req, res) {
  const warehouseId = integer(req.body.warehouse_id);
  if (warehouseId === null) {
    return res.status(400).json({ message: 'warehouse_id is required and must be an integer' });
  }

  const rawItems = readDonationItems(req.body);
  if (rawItems === null) {
    return res.status(400).json({ message: 'warehouse_id, item_id, and a positive integer quantity are required' });
  }

  const items = validateDonationItems(rawItems);
  if (typeof items === 'string') return res.status(400).json({ message: items });

  const donorId = req.user.user_id;
  const isSingleLegacy = !Array.isArray(req.body.items);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const warehouse = await client.query(FIND_WAREHOUSE, [warehouseId]);
    if (!warehouse.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Validate all items exist before any insert
    for (const { item_id } of items) {
      const item = await client.query(FIND_ITEM, [item_id]);
      if (!item.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `Item not found: ${item_id}` });
      }
    }

    const donations = [];
    const inventories = [];
    for (const { item_id, quantity } of items) {
      const donationResult = await client.query(CREATE_DONATION, [donorId, warehouseId, item_id, quantity]);
      const inventoryResult = await client.query(UPSERT_INVENTORY, [warehouseId, item_id, quantity]);
      donations.push(donationResult.rows[0]);
      inventories.push(inventoryResult.rows[0]);
    }

    await client.query('COMMIT');

    // Backward compatibility: single-item payload returns singular keys
    if (isSingleLegacy && donations.length === 1) {
      return res.status(201).json({ donation: donations[0], inventory: inventories[0], donations, inventories });
    }
    return res.status(201).json({ donations, inventories });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[donations/create] error:', err);
    return res.status(500).json({ message: 'Failed to create donation' });
  } finally {
    client.release();
  }
}

async function listMyDonations(req, res) {
  try {
    const result = await pool.query(LIST_MY_DONATIONS, [req.user.user_id]);
    return res.json({ donations: result.rows });
  } catch (err) {
    console.error('[donations/listMine] error:', err);
    return res.status(500).json({ message: 'Failed to load donations' });
  }
}

async function listDonations(req, res) {
  try {
    const result = await pool.query(LIST_DONATIONS);
    return res.json({ donations: result.rows });
  } catch (err) {
    console.error('[donations/list] error:', err);
    return res.status(500).json({ message: 'Failed to load donations' });
  }
}

async function getDonation(req, res) {
  try {
    const result = await pool.query(GET_DONATION, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Donation not found' });
    const donation = result.rows[0];
    const isAdmin = String(req.user.role).toLowerCase() === 'admin';
    if (!isAdmin && donation.donor_id !== req.user.user_id) {
      return res.status(403).json({ message: 'You do not have permission for this action' });
    }
    return res.json({ donation });
  } catch (err) {
    console.error('[donations/get] error:', err);
    return res.status(500).json({ message: 'Failed to load donation' });
  }
}

module.exports = { createDonation, listMyDonations, listDonations, getDonation };
