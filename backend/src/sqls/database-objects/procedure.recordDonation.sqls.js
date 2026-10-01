// Donation workflow procedure SQL.
// Inspectable copy of backend/migrations/024_record_donation_procedure.sql.
// CALL_RECORD_DONATION is executed by createDonation in donationController.js,
// which reads back the created rows with GET_CREATED_DONATIONS.

const CREATE_RECORD_DONATION_PROCEDURE = `CREATE OR REPLACE PROCEDURE record_donation(
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
$$;`;

const CALL_RECORD_DONATION = `CALL record_donation($1, $2, $3::jsonb, NULL::int[])`;

const DROP_RECORD_DONATION_PROCEDURE = `DROP PROCEDURE IF EXISTS record_donation(INT, INT, JSONB, INT[]);`;

module.exports = {
  CREATE_RECORD_DONATION_PROCEDURE,
  CALL_RECORD_DONATION,
  DROP_RECORD_DONATION_PROCEDURE,
};
