-- Record a donor's warehouse donation in one atomic call: validate the
-- warehouse and every item, insert the donation rows, and add the quantities
-- to warehouse inventory. Returns the created donation ids so the caller can
-- read back the exact rows for its response.
-- Inspectable copy: backend/src/sqls/database-objects/recordDonationProcedureSqls.js

CREATE OR REPLACE PROCEDURE record_donation(
  p_donor_id INT,
  p_warehouse_id INT,
  p_items JSONB,
  INOUT p_donation_ids INT[] DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
  item RECORD;
  v_donation_id INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM warehouses WHERE warehouse_id = p_warehouse_id AND archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'WAREHOUSE_NOT_FOUND';
  END IF;

  p_donation_ids := '{}';

  FOR item IN
    SELECT (e->>'item_id')::int AS item_id, (e->>'quantity')::int AS quantity
    FROM jsonb_array_elements(p_items) e
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM items WHERE item_id = item.item_id AND archived_at IS NULL
    ) THEN
      RAISE EXCEPTION 'ITEM_NOT_FOUND:%', item.item_id;
    END IF;

    INSERT INTO donations (donor_id, warehouse_id, item_id, quantity)
    VALUES (p_donor_id, p_warehouse_id, item.item_id, item.quantity)
    RETURNING donation_id INTO v_donation_id;
    p_donation_ids := p_donation_ids || v_donation_id;

    INSERT INTO inventory (warehouse_id, item_id, quantity)
    VALUES (p_warehouse_id, item.item_id, item.quantity)
    ON CONFLICT (warehouse_id, item_id)
    DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity,
      archived_at = NULL;
  END LOOP;
END;
$$;
