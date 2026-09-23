-- Set a request item's dispatched quantity and auto-advance the request status.
-- Touches request_items and relief_requests atomically in one call.
-- Inspectable copy: backend/src/sqls/database-objects/dispatchUpdateProcedureSqls.js

CREATE OR REPLACE PROCEDURE set_dispatched(
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
$$;
