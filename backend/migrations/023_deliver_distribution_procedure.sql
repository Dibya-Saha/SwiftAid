-- Complete a picked-up / in-transit distribution in one atomic call: move
-- every item into shelter stock, count it as dispatched, and stamp the
-- distribution delivered. The request-status sync trigger advances the parent
-- relief request automatically.
-- Inspectable copy: backend/src/sqls/database-objects/deliverDistributionProcedureSqls.js

CREATE OR REPLACE PROCEDURE deliver_distribution(p_distribution_id INT)
LANGUAGE plpgsql AS $$
DECLARE
  v_status TEXT;
  v_request_id INT;
  v_shelter_id INT;
  r RECORD;
BEGIN
  SELECT d.status, d.request_id, rr.shelter_id
  INTO v_status, v_request_id, v_shelter_id
  FROM distributions d
  JOIN relief_requests rr ON rr.request_id = d.request_id
  WHERE d.distribution_id = p_distribution_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DISTRIBUTION_NOT_FOUND';
  END IF;
  IF v_status NOT IN ('picked_up', 'in_transit') THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION';
  END IF;

  FOR r IN
    SELECT request_item_id, item_id, quantity
    FROM distribution_items
    WHERE distribution_id = p_distribution_id
  LOOP
    INSERT INTO shelter_inventory (shelter_id, item_id, quantity, updated_at)
    VALUES (v_shelter_id, r.item_id, r.quantity, CURRENT_TIMESTAMP)
    ON CONFLICT (shelter_id, item_id)
    DO UPDATE SET quantity = shelter_inventory.quantity + EXCLUDED.quantity,
      updated_at = CURRENT_TIMESTAMP;

    UPDATE request_items
    SET quantity_dispatched = quantity_dispatched + r.quantity
    WHERE request_item_id = r.request_item_id;
  END LOOP;

  UPDATE distributions
  SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP
  WHERE distribution_id = p_distribution_id;
END;
$$;
