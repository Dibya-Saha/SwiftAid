-- Rollback for 014_inventory_audit_trigger.sql

DROP TRIGGER IF EXISTS trg_inventory_audit ON inventory;
DROP FUNCTION IF EXISTS log_inventory_audit();
DROP TABLE IF EXISTS inventory_audit_log;
