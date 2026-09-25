// Dispatched-quantity update procedure SQL.
// Inspectable copy of backend/migrations/018_set_dispatched_procedure.sql.
// CALL_SET_DISPATCHED is executed by updateDispatchedQuantity in
// backend/src/controllers/reliefRequestController.js: setting the dispatched
// quantity and advancing the request status runs atomically in one call.

const CREATE_SET_DISPATCHED_PROCEDURE = `CREATE OR REPLACE PROCEDURE set_dispatched(
  p_request_id INT,
  p_request_item_id INT,
  p_quantity INT
)
LANGUAGE plpgsql AS $$
DECLARE
  v_requested INT;
  v_all BOOLEAN;
  v_some BOOLEAN;
BEGIN
  UPDATE request_items
  SET quantity_dispatched = p_quantity
  WHERE request_item_id = p_request_item_id
    AND request_id = p_request_id
  RETURNING quantity_requested INTO v_requested;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_ITEM_NOT_FOUND';
  END IF;
  IF p_quantity > v_requested THEN
    RAISE EXCEPTION 'EXCEEDS_REQUESTED';
  END IF;

  SELECT every(quantity_dispatched >= quantity_requested),
         bool_or(quantity_dispatched > 0)
  INTO v_all, v_some
  FROM request_items
  WHERE request_id = p_request_id;

  IF v_all THEN
    UPDATE relief_requests SET status = 'fulfilled' WHERE request_id = p_request_id;
  ELSIF v_some THEN
    UPDATE relief_requests SET status = 'partially_fulfilled' WHERE request_id = p_request_id;
  END IF;
END;
$$;`;

const CALL_SET_DISPATCHED = `CALL set_dispatched($1, $2, $3)`;

const GET_UPDATED_ITEM = `SELECT request_item_id, request_id, item_id,
    quantity_requested, quantity_dispatched
  FROM request_items WHERE request_item_id = $1 AND request_id = $2`;

module.exports = {
  CREATE_SET_DISPATCHED_PROCEDURE,
  CALL_SET_DISPATCHED,
  GET_UPDATED_ITEM,
};
