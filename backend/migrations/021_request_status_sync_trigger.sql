-- Keep relief_requests.status in sync whenever a request item's dispatched
-- quantity changes: fully dispatched requests become fulfilled, partially
-- dispatched ones become partially_fulfilled. Mirrors the status transitions
-- previously computed in the delivery and donation controllers.
-- Inspectable copy: backend/src/sqls/database-objects/requestStatusSyncTriggerSqls.js

CREATE OR REPLACE FUNCTION sync_relief_request_status()
RETURNS TRIGGER AS $$
DECLARE
  v_all BOOLEAN;
  v_some BOOLEAN;
BEGIN
  IF NEW.quantity_dispatched IS NOT DISTINCT FROM OLD.quantity_dispatched THEN
    RETURN NEW;
  END IF;

  SELECT every(quantity_dispatched >= quantity_requested),
         bool_or(quantity_dispatched > 0)
  INTO v_all, v_some
  FROM request_items
  WHERE request_id = NEW.request_id;

  IF v_all THEN
    UPDATE relief_requests SET status = 'fulfilled' WHERE request_id = NEW.request_id;
  ELSIF v_some THEN
    UPDATE relief_requests SET status = 'partially_fulfilled' WHERE request_id = NEW.request_id
      AND status IN ('waiting_stock', 'approved');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_relief_request_status ON request_items;

CREATE TRIGGER trg_sync_relief_request_status
  AFTER UPDATE OF quantity_dispatched ON request_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_relief_request_status();
