-- Keep an audit trail for every shelter inventory insert, quantity update,
-- and hard delete, mirroring the warehouse inventory audit log.
-- Inspectable copy: backend/src/sqls/database-objects/shelterInventoryAuditSqls.js

CREATE TABLE IF NOT EXISTS shelter_inventory_audit_log (
  audit_id SERIAL PRIMARY KEY,
  shelter_inventory_id INT NOT NULL,
  shelter_id INT NOT NULL,
  item_id INT NOT NULL,
  old_quantity INT NOT NULL,
  new_quantity INT NOT NULL,
  delta INT NOT NULL,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION log_shelter_inventory_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO shelter_inventory_audit_log (
      shelter_inventory_id, shelter_id, item_id, old_quantity, new_quantity, delta, action_type
    ) VALUES (
      NEW.shelter_inventory_id, NEW.shelter_id, NEW.item_id, 0, NEW.quantity, NEW.quantity, 'INSERT'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO shelter_inventory_audit_log (
      shelter_inventory_id, shelter_id, item_id, old_quantity, new_quantity, delta, action_type
    ) VALUES (
      NEW.shelter_inventory_id,
      NEW.shelter_id,
      NEW.item_id,
      OLD.quantity,
      NEW.quantity,
      NEW.quantity - OLD.quantity,
      'UPDATE'
    );
    RETURN NEW;
  END IF;

  INSERT INTO shelter_inventory_audit_log (
    shelter_inventory_id, shelter_id, item_id, old_quantity, new_quantity, delta, action_type
  ) VALUES (
    OLD.shelter_inventory_id, OLD.shelter_id, OLD.item_id, OLD.quantity, 0, -OLD.quantity, 'DELETE'
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shelter_inventory_audit ON shelter_inventory;

CREATE TRIGGER trg_shelter_inventory_audit
  AFTER INSERT OR UPDATE OR DELETE ON shelter_inventory
  FOR EACH ROW
  EXECUTE FUNCTION log_shelter_inventory_audit();
