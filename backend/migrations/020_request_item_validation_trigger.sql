-- Reject dispatched quantities that exceed what was requested, even when the
-- update bypasses the application. The lower bound (>= 0) is already covered
-- by the request_items_quantity_dispatched_check constraint.
-- Inspectable copy: backend/src/sqls/database-objects/requestItemValidationTriggerSqls.js

CREATE OR REPLACE FUNCTION validate_request_item_dispatched()
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
  EXECUTE FUNCTION validate_request_item_dispatched();
