const pool = require('../db');
const sql = require('../sqls/distributionSqls');

function integer(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

async function createDistribution(req, res) {
  const requestId = integer(req.body.request_id);
  const warehouseId = integer(req.body.warehouse_id);
  const teamId = integer(req.body.team_id);
  const rawItems = req.body.items;
  if ([requestId, warehouseId, teamId].some((value) => value === null) || !Array.isArray(rawItems) || !rawItems.length) {
    return res.status(400).json({ message: 'request_id, warehouse_id, team_id, and items are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = await client.query(sql.FIND_REQUEST, [requestId]);
    if (!request.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Relief request not found' }); }
    if (!['approved', 'waiting_stock', 'partially_fulfilled'].includes(String(request.rows[0].status).toLowerCase())) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Relief request is not ready for distribution' });
    }
    const team = await client.query(sql.FIND_TEAM, [teamId]);
    if (!team.rows[0]) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Team is not approved' }); }

    const items = [];
    for (const raw of rawItems) {
      const requestItemId = integer(raw.request_item_id);
      const quantity = integer(raw.quantity);
      if (requestItemId === null || quantity === null || quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Each distribution item requires a positive integer quantity' });
      }
      const requestItem = await client.query(sql.FIND_REQUEST_ITEM, [requestItemId, requestId]);
      if (!requestItem.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Request item not found' }); }
      const remaining = requestItem.rows[0].quantity_requested - requestItem.rows[0].quantity_dispatched;
      if (quantity > remaining) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Distribution exceeds the remaining requested quantity' }); }
      const stock = await client.query(sql.RESERVE_WAREHOUSE_STOCK, [warehouseId, requestItem.rows[0].item_id, quantity]);
      if (!stock.rows[0]) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Warehouse does not have enough stock' }); }
      items.push({ request_item_id: requestItemId, item_id: requestItem.rows[0].item_id, quantity });
    }

    const distribution = await client.query(sql.CREATE_DISTRIBUTION, [requestId, warehouseId, teamId, req.user.user_id]);
    for (const item of items) await client.query(sql.CREATE_DISTRIBUTION_ITEM, [distribution.rows[0].distribution_id, item.request_item_id, item.item_id, item.quantity]);
    await client.query('COMMIT');
    return res.status(201).json({ distribution: distribution.rows[0], items });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[distributions/create] error:', err);
    return res.status(500).json({ message: 'Failed to create distribution' });
  } finally { client.release(); }
}

async function listDistributions(req, res) {
  try { return res.json({ distributions: (await pool.query(sql.LIST_DISTRIBUTIONS)).rows }); }
  catch (err) { console.error('[distributions/list] error:', err); return res.status(500).json({ message: 'Failed to load distributions' }); }
}

async function listMyDistributions(req, res) {
  try { return res.json({ distributions: (await pool.query(sql.LIST_TEAM_DISTRIBUTIONS, [req.user.user_id])).rows }); }
  catch (err) { console.error('[distributions/mine] error:', err); return res.status(500).json({ message: 'Failed to load assigned distributions' }); }
}

async function updateDistributionStatus(req, res) {
  const id = integer(req.params.id);
  const status = String(req.body.status || '').toLowerCase();
  if (id === null || !['picked_up', 'in_transit', 'delivered', 'cancelled'].includes(status)) return res.status(400).json({ message: 'Invalid distribution status' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(sql.LOCK_DISTRIBUTION, [id]);
    if (!locked.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Distribution not found' }); }
    const current = locked.rows[0];
    const isAdmin = String(req.user.role).toLowerCase() === 'admin';
    if (!isAdmin) {
      const member = await client.query('SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2', [current.assigned_team_id, req.user.user_id]);
      if (!member.rows[0]) { await client.query('ROLLBACK'); return res.status(403).json({ message: 'You are not assigned to this distribution' }); }
    }
    if (current.status === 'delivered' || current.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Completed or cancelled distributions cannot be changed' });
    }
    if (status === 'delivered' && !['picked_up', 'in_transit'].includes(current.status)) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Distribution must be picked up before delivery' }); }
    const items = (await client.query(sql.GET_DISTRIBUTION_ITEMS, [id])).rows;
    if (status === 'delivered') {
      for (const item of items) {
        await client.query(sql.ADD_SHELTER_STOCK, [current.shelter_id, item.item_id, item.quantity]);
        await client.query(sql.INCREMENT_REQUEST_ITEM, [item.request_item_id, item.quantity]);
      }
      const all = await client.query(sql.LOCK_ALL_REQUEST_ITEMS, [current.request_id]);
      if (all.rows.length && all.rows.every((item) => item.quantity_dispatched >= item.quantity_requested)) await client.query(sql.FULFILL_REQUEST, [current.request_id]);
    } else if (status === 'cancelled' && ['assigned', 'picked_up', 'in_transit'].includes(current.status)) {
      for (const item of items) await client.query(sql.RETURN_WAREHOUSE_STOCK, [current.warehouse_id, item.item_id, item.quantity]);
    }
    const result = await client.query(sql.UPDATE_DISTRIBUTION_STATUS, [id, status]);
    await client.query('COMMIT');
    return res.json({ distribution: result.rows[0] });
  } catch (err) { await client.query('ROLLBACK'); console.error('[distributions/status] error:', err); return res.status(500).json({ message: 'Failed to update distribution' }); }
  finally { client.release(); }
}

module.exports = { createDistribution, listDistributions, listMyDistributions, updateDistributionStatus };
