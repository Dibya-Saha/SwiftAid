-- Keep an audit trail for every warehouse inventory insert, quantity/archive
-- update, and hard delete.

CREATE TABLE IF NOT EXISTS inventory_audit_log (
  audit_id SERIAL PRIMARY KEY,
  inventory_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  item_id INT NOT NULL,
  old_quantity INT NOT NULL,
  new_quantity INT NOT NULL,
  delta INT NOT NULL,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE', 'ARCHIVE')),
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION log_inventory_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO inventory_audit_log (
      inventory_id, warehouse_id, item_id, old_quantity, new_quantity, delta, action_type
    ) VALUES (
      NEW.inventory_id, NEW.warehouse_id, NEW.item_id, 0, NEW.quantity, NEW.quantity, 'INSERT'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO inventory_audit_log (
      inventory_id, warehouse_id, item_id, old_quantity, new_quantity, delta, action_type
    ) VALUES (
      NEW.inventory_id,
      NEW.warehouse_id,
      NEW.item_id,
      OLD.quantity,
      NEW.quantity,
      CASE WHEN OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL
        THEN 0 ELSE NEW.quantity - OLD.quantity END,
      CASE WHEN OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL
        THEN 'ARCHIVE' ELSE 'UPDATE' END
    );
    RETURN NEW;
  END IF;

  INSERT INTO inventory_audit_log (
    inventory_id, warehouse_id, item_id, old_quantity, new_quantity, delta, action_type
  ) VALUES (
    OLD.inventory_id, OLD.warehouse_id, OLD.item_id, OLD.quantity, 0, -OLD.quantity, 'DELETE'
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_audit ON inventory;

CREATE TRIGGER trg_inventory_audit
  AFTER INSERT OR UPDATE OR DELETE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION log_inventory_audit();
