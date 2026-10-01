// Delivery workflow procedure SQL.
// Inspectable copy of backend/migrations/023_deliver_distribution_procedure.sql.
// CALL_DELIVER_DISTRIBUTION is executed by updateDistributionStatus in
// distributionController.js; GET_DELIVERED_DISTRIBUTION reads back the result.

const CREATE_DELIVER_DISTRIBUTION_PROCEDURE = `CREATE OR REPLACE PROCEDURE deliver_distribution(p_distribution_id INT)
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
$$;`;

const CALL_DELIVER_DISTRIBUTION = `CALL deliver_distribution($1)`;

const DROP_DELIVER_DISTRIBUTION_PROCEDURE = `DROP PROCEDURE IF EXISTS deliver_distribution(INT);`;

module.exports = {
  CREATE_DELIVER_DISTRIBUTION_PROCEDURE,
  CALL_DELIVER_DISTRIBUTION,
  DROP_DELIVER_DISTRIBUTION_PROCEDURE,
};
