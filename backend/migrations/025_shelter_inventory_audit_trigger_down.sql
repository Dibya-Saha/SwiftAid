-- Rollback for 025_shelter_inventory_audit_trigger.sql

DROP TRIGGER IF EXISTS trg_shelter_inventory_audit ON shelter_inventory;
DROP FUNCTION IF EXISTS log_shelter_inventory_audit();
DROP TABLE IF EXISTS shelter_inventory_audit_log;
