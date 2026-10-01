-- Rollback for 015_fix_inventory_audit_action_types.sql

ALTER TABLE inventory_audit_log
  DROP CONSTRAINT IF EXISTS inventory_audit_log_action_type_check;

ALTER TABLE inventory_audit_log
  ADD CONSTRAINT inventory_audit_log_action_type_check
  CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE'));
