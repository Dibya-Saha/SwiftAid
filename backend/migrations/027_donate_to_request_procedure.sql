-- Donate items to a relief request in one atomic call: validate the request
-- and every item, insert the donation rows, count the quantities as
-- dispatched, and add them to shelter inventory. The parent request status is
-- advanced automatically by the sync_relief_request_status trigger (021).
-- Inspectable copy: backend/src/sqls/database-objects/donateToRequestProcedureSqls.js

CREATE OR REPLACE PROCEDURE donate_to_request(
  p_request_id INT,
  p_donor_id INT,
  p_items JSONB,
  INOUT p_donation_ids INT[] DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
  v_shelter_id INT;
  v_status TEXT;
  item RECORD;
  v_request_item_id INT;
  v_remaining INT;
  v_donation_id INT;
BEGIN
  SELECT rr.shelter_id, rr.status INTO v_shelter_id, v_status
  FROM relief_requests rr
  WHERE rr.request_id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;

  PERFORM 1 FROM shelters s
  WHERE s.shelter_id = v_shelter_id AND s.archived_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SHELTER_ARCHIVED';
  END IF;

  IF LOWER(v_status) = 'rejected' THEN
    RAISE EXCEPTION 'REQUEST_REJECTED';
  END IF;
  IF LOWER(v_status) = 'fulfilled' THEN
    RAISE EXCEPTION 'REQUEST_FULFILLED';
  END IF;

  p_donation_ids := '{}';

  FOR item IN
    SELECT (e->>'item_id')::int AS item_id, (e->>'quantity')::int AS quantity
    FROM jsonb_array_elements(p_items) e
  LOOP
    IF item.quantity IS NULL OR item.quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY:%', item.item_id;
    END IF;

    SELECT ri.request_item_id,
           ri.quantity_requested - ri.quantity_dispatched AS remaining
    INTO v_request_item_id, v_remaining
    FROM request_items ri
    WHERE ri.request_id = p_request_id AND ri.item_id = item.item_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'REQUEST_ITEM_NOT_FOUND:%', item.item_id;
    END IF;

    IF v_remaining <= 0 THEN
      RAISE EXCEPTION 'ITEM_NO_REMAINING:%', item.item_id;
    END IF;
    IF item.quantity > v_remaining THEN
      RAISE EXCEPTION 'QUANTITY_EXCEEDS_REMAINING:%:%:%', item.item_id, item.quantity, v_remaining;
    END IF;

    INSERT INTO donations (donor_id, shelter_id, request_id, item_id, quantity)
    VALUES (p_donor_id, v_shelter_id, p_request_id, item.item_id, item.quantity)
    RETURNING donation_id INTO v_donation_id;
    p_donation_ids := p_donation_ids || v_donation_id;

    UPDATE request_items
    SET quantity_dispatched = quantity_dispatched + item.quantity
    WHERE request_item_id = v_request_item_id;

    INSERT INTO shelter_inventory (shelter_id, item_id, quantity)
    VALUES (v_shelter_id, item.item_id, item.quantity)
    ON CONFLICT (shelter_id, item_id)
    DO UPDATE SET quantity = shelter_inventory.quantity + EXCLUDED.quantity,
      updated_at = CURRENT_TIMESTAMP;
  END LOOP;
END;
$$;
