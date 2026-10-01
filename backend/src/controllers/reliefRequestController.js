const pool = require("../db");
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
  GET_CREATED_REQUEST_DONATIONS,
} = require("../sqls/reliefRequestSqls");
const procedureSql = require("../sqls/database-objects/procedure.dispatchUpdate.sqls");
const donateProcedureSql = require("../sqls/database-objects/procedure.donateToRequest.sqls");

const ALLOWED_STATUSES = [
  "waiting_stock",
  "approved",
  "partially_fulfilled",
  "rejected",
  "fulfilled",
];

function integer(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

async function createReliefRequest(req, res) {
  const shelterId = integer(req.body.shelter_id);
  if (shelterId === null) {
    return res
      .status(400)
      .json({ message: "shelter_id is required and must be an integer" });
  }

  const rawItems = req.body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return res.status(400).json({ message: "At least one item is required" });
  }
  if (rawItems.length > 20) {
    return res.status(400).json({ message: "Maximum 20 items per request" });
  }

  // Merge duplicate item_id by summing quantity_requested
  const merged = new Map();
  for (const raw of rawItems) {
    const itemId = integer(raw.item_id);
    const qty = integer(raw.quantity_requested);
    if (itemId === null || qty === null || qty <= 0) {
      return res
        .status(400)
        .json({
          message:
            "Each item requires a valid item_id and a positive integer quantity_requested",
        });
    }
    merged.set(itemId, (merged.get(itemId) || 0) + qty);
  }
  if (merged.size === 0) {
    return res.status(400).json({ message: "At least one item is required" });
  }
  if (merged.size > 20) {
    return res
      .status(400)
      .json({ message: "Maximum 20 unique items per request" });
  }
  const items = Array.from(merged, ([item_id, quantity_requested]) => ({
    item_id,
    quantity_requested,
  }));

  const requestedByAdminId = req.user.user_id;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const shelter = await client.query(FIND_SHELTER, [shelterId]);
    if (!shelter.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Shelter not found" });
    }

    for (const { item_id } of items) {
      const item = await client.query(FIND_ITEM, [item_id]);
      if (!item.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: `Item not found: ${item_id}` });
      }
    }

    const reqResult = await client.query(CREATE_RELIEF_REQUEST, [
      shelterId,
      requestedByAdminId,
    ]);
    const created = reqResult.rows[0];

    const insertedItems = [];
    for (const { item_id, quantity_requested } of items) {
      const r = await client.query(CREATE_REQUEST_ITEM, [
        created.request_id,
        item_id,
        quantity_requested,
      ]);
      insertedItems.push(r.rows[0]);
    }

    await client.query("COMMIT");

    // Fetch enriched items for response
    const enriched = await pool.query(GET_REQUEST_ITEMS, [created.request_id]);
    const shelterInfo = shelter.rows[0];
    return res.status(201).json({
      request: {
        ...created,
        shelter_name: shelterInfo.name,
        items: enriched.rows,
      },
      request_id: created.request_id,
      items: enriched.rows,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[reliefRequests/create] error:", err);
    return res.status(500).json({ message: "Failed to create relief request" });
  } finally {
    client.release();
  }
}

async function listReliefRequests(req, res) {
  try {
    const result = await pool.query(LIST_RELIEF_REQUESTS);
    return res.json({ requests: result.rows, relief_requests: result.rows });
  } catch (err) {
    console.error("[reliefRequests/list] error:", err);
    return res.status(500).json({ message: "Failed to load relief requests" });
  }
}

async function getReliefRequest(req, res) {
  const id = integer(req.params.id);
  if (id === null)
    return res.status(400).json({ message: "Invalid request id" });
  try {
    const result = await pool.query(GET_RELIEF_REQUEST, [id]);
    if (!result.rows[0])
      return res.status(404).json({ message: "Relief request not found" });
    const itemsResult = await pool.query(GET_REQUEST_ITEMS, [id]);
    const enriched = itemsResult.rows.map((r) => ({
      ...r,
      remaining: r.quantity_requested - r.quantity_dispatched,
    }));
    const request = { ...result.rows[0], items: enriched };
    return res.json({ request, items: enriched });
  } catch (err) {
    console.error("[reliefRequests/get] error:", err);
    return res.status(500).json({ message: "Failed to load relief request" });
  }
}

async function listEligibleRequests(req, res) {
  try {
    const result = await pool.query(LIST_ELIGIBLE_REQUESTS);
    const requests = [];
    for (const r of result.rows) {
      const itemsRes = await pool.query(GET_ELIGIBLE_REQUEST_ITEMS, [
        r.request_id,
      ]);
      const items = itemsRes.rows.map((it) => ({
        request_item_id: it.request_item_id,
        item_id: it.item_id,
        item_name: it.item_name,
        unit: it.unit,
        remaining: Number(it.remaining),
      }));
      if (items.length === 0) continue;
      requests.push({
        request_id: r.request_id,
        shelter_id: r.shelter_id,
        shelter_name: r.shelter_name,
        items,
      });
    }
    return res.json({ requests, relief_requests: requests });
  } catch (err) {
    console.error("[reliefRequests/listEligible] error:", err);
    return res
      .status(500)
      .json({ message: "Failed to load eligible requests" });
  }
}

async function donateToReliefRequest(req, res) {
  const requestId = integer(req.params.id);
  if (requestId === null)
    return res.status(400).json({ message: "Invalid request id" });

  // Support both single item payload and items array
  let donations = [];
  if (Array.isArray(req.body.items)) {
    donations = req.body.items;
  } else {
    const itemId = integer(req.body.item_id);
    const qty = integer(req.body.quantity);
    if (itemId !== null && qty !== null)
      donations = [{ item_id: itemId, quantity: qty }];
    else if (
      req.body.item_id !== undefined ||
      req.body.quantity !== undefined
    ) {
      return res
        .status(400)
        .json({ message: "item_id and quantity are required" });
    } else {
      return res
        .status(400)
        .json({ message: "item_id and quantity or items array is required" });
    }
  }
  if (donations.length === 0)
    return res
      .status(400)
      .json({ message: "At least one donation item is required" });
  if (donations.length > 20)
    return res.status(400).json({ message: "Maximum 20 items per donation" });

  const merged = new Map();
  for (const d of donations) {
    const itemId = integer(d.item_id);
    const qty = integer(d.quantity);
    if (itemId === null || qty === null || qty <= 0) {
      return res
        .status(400)
        .json({
          message: "Each item requires valid item_id and positive quantity",
        });
    }
    merged.set(itemId, (merged.get(itemId) || 0) + qty);
  }
  const itemsToDonate = Array.from(merged, ([item_id, quantity]) => ({
    item_id,
    quantity,
  }));

  const donorId = req.user.user_id;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(FIND_RELIEF_REQUEST, [requestId]);
    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Relief request not found" });
    }
    const previousStatus = String(existing.rows[0].status || "").toLowerCase();

    // Request/item validation, donation inserts, dispatched increments, and
    // shelter inventory updates run atomically inside the database procedure.
    // The status-sync trigger advances the parent request automatically.
    let donationIds = [];
    try {
      const callResult = await client.query(
        donateProcedureSql.CALL_DONATE_TO_REQUEST,
        [requestId, donorId, JSON.stringify(itemsToDonate)],
      );
      donationIds = callResult.rows[0].p_donation_ids || [];
    } catch (procedureErr) {
      const procedureMessage = String(procedureErr.message || "");
      await client.query("ROLLBACK");
      if (procedureMessage.includes("REQUEST_NOT_FOUND"))
        return res.status(404).json({ message: "Relief request not found" });
      if (procedureMessage.includes("SHELTER_ARCHIVED"))
        return res.status(400).json({
          message: "Cannot donate to a request for an archived shelter",
        });
      if (procedureMessage.includes("REQUEST_REJECTED"))
        return res
          .status(400)
          .json({ message: "Cannot donate to a rejected request" });
      if (procedureMessage.includes("REQUEST_FULFILLED"))
        return res
          .status(400)
          .json({ message: "Cannot donate to a fulfilled request" });
      const missingItem = procedureMessage.match(/REQUEST_ITEM_NOT_FOUND:(\d+)/);
      if (missingItem)
        return res.status(404).json({
          message: `Request item not found for item_id: ${missingItem[1]}`,
        });
      const noRemaining = procedureMessage.match(/ITEM_NO_REMAINING:(\d+)/);
      if (noRemaining)
        return res.status(400).json({
          message: `Item ${noRemaining[1]} has no remaining shortage`,
        });
      const exceeds = procedureMessage.match(
        /QUANTITY_EXCEEDS_REMAINING:(\d+):(\d+):(\d+)/,
      );
      if (exceeds)
        return res.status(400).json({
          message: `Donation quantity ${exceeds[2]} exceeds remaining ${exceeds[3]} for item ${exceeds[1]}`,
        });
      throw procedureErr;
    }

    const created = (
      await client.query(GET_CREATED_REQUEST_DONATIONS, [donationIds])
    ).rows;
    const finalStatus = String(
      (await client.query(FIND_RELIEF_REQUEST, [requestId])).rows[0].status ||
        "",
    ).toLowerCase();
    await client.query("COMMIT");

    const donations = created.map((row) => ({
      donation_id: row.donation_id,
      donor_id: row.donor_id,
      shelter_id: row.shelter_id,
      request_id: row.request_id,
      item_id: row.item_id,
      quantity: row.quantity,
      donated_at: row.donated_at,
    }));
    const updatedItems = created.map((row) => ({
      request_item_id: row.request_item_id,
      request_id: row.request_id,
      item_id: row.item_id,
      quantity_requested: row.quantity_requested,
      quantity_dispatched: row.quantity_dispatched,
    }));
    const shelterInventories = created.map((row) => ({
      shelter_inventory_id: row.shelter_inventory_id,
      shelter_id: row.shelter_id,
      item_id: row.item_id,
      quantity: row.shelter_quantity,
    }));

    return res.status(201).json({
      donations,
      updated_items: updatedItems,
      shelter_inventories: shelterInventories,
      fulfilled: finalStatus === "fulfilled",
      status: finalStatus === previousStatus ? null : finalStatus,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[reliefRequests/donate] error:", err);
    return res.status(500).json({ message: "Failed to process donation" });
  } finally {
    client.release();
  }
}

async function updateReliefRequestStatus(req, res) {
  const id = integer(req.params.id);
  if (id === null)
    return res.status(400).json({ message: "Invalid request id" });
  const status = String(req.body.status || "").toLowerCase();
  if (!ALLOWED_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({
        message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
      });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(FIND_RELIEF_REQUEST, [id]);
    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Relief request not found" });
    }
    const result = await client.query(UPDATE_REQUEST_STATUS, [id, status]);
    await client.query("COMMIT");
    return res.json({ request: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[reliefRequests/updateStatus] error:", err);
    return res.status(500).json({ message: "Failed to update status" });
  } finally {
    client.release();
  }
}

async function updateDispatchedQuantity(req, res) {
  const requestId = integer(req.params.id);
  const itemIdParam = integer(req.params.itemId);
  if (requestId === null || itemIdParam === null) {
    return res.status(400).json({ message: "Invalid request id or item id" });
  }
  const quantityDispatched = integer(req.body.quantity_dispatched);
  if (quantityDispatched === null || quantityDispatched < 0) {
    return res
      .status(400)
      .json({ message: "quantity_dispatched must be a non-negative integer" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const reqExists = await client.query(FIND_RELIEF_REQUEST, [requestId]);
    if (!reqExists.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Relief request not found" });
    }

    let requestItem = await client.query(FIND_REQUEST_ITEM, [
      itemIdParam,
      requestId,
    ]);
    if (!requestItem.rows[0]) {
      requestItem = await client.query(FIND_REQUEST_ITEM_BY_ITEM, [
        requestId,
        itemIdParam,
      ]);
    }
    if (!requestItem.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Request item not found" });
    }

    // Setting the dispatched quantity and advancing the request status runs
    // atomically inside the database procedure.
    await client.query(procedureSql.CALL_SET_DISPATCHED, [
      requestId,
      requestItem.rows[0].request_item_id,
      quantityDispatched,
    ]);
    const result = await client.query(procedureSql.GET_UPDATED_ITEM, [
      requestItem.rows[0].request_item_id,
      requestId,
    ]);
    await client.query("COMMIT");
    return res.json({ request_item: result.rows[0], item: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    const message = String(err.message || "");
    if (message.includes("REQUEST_ITEM_NOT_FOUND"))
      return res.status(404).json({ message: "Request item not found" });
    if (message.includes("EXCEEDS_REQUESTED"))
      return res
        .status(400)
        .json({
          message: "quantity_dispatched must not exceed quantity_requested",
        });
    console.error("[reliefRequests/updateDispatched] error:", err);
    return res
      .status(500)
      .json({ message: "Failed to update dispatched quantity" });
  } finally {
    client.release();
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
