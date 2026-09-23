// Dispatched quantity upper-bound validation trigger SQL.
// Inspectable copy of backend/migrations/020_request_item_validation_trigger.sql.
// Fires automatically on every request_items insert or dispatched/requested
// update; the lower bound (>= 0) is enforced by the
// request_items_quantity_dispatched_check constraint.

const CREATE_REQUEST_ITEM_VALIDATION_TRIGGER = `CREATE OR REPLACE FUNCTION validate_request_item_dispatched()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_dispatched > NEW.quantity_requested THEN
    RAISE EXCEPTION 'DISPATCHED_EXCEEDS_REQUESTED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_request_item_dispatched ON request_items;

CREATE TRIGGER trg_validate_request_item_dispatched
  BEFORE INSERT OR UPDATE OF quantity_requested, quantity_dispatched ON request_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_request_item_dispatched();`;

const DROP_REQUEST_ITEM_VALIDATION_TRIGGER = `DROP TRIGGER IF EXISTS trg_validate_request_item_dispatched ON request_items;
DROP FUNCTION IF EXISTS validate_request_item_dispatched();`;

module.exports = {
  CREATE_REQUEST_ITEM_VALIDATION_TRIGGER,
  DROP_REQUEST_ITEM_VALIDATION_TRIGGER,
};
