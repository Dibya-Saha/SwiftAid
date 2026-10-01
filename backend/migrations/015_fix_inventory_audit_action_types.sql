-- Allow soft-archive events in the inventory audit log. Older databases may
-- already have the table with a check constraint that omitted ARCHIVE.

ALTER TABLE inventory_audit_log
  DROP CONSTRAINT IF EXISTS inventory_audit_log_action_type_check;

ALTER TABLE inventory_audit_log
  ADD CONSTRAINT inventory_audit_log_action_type_check
  CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE', 'ARCHIVE'));
