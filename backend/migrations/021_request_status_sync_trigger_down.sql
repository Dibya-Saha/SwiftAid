-- Rollback for 021_request_status_sync_trigger.sql

DROP TRIGGER IF EXISTS trg_sync_relief_request_status ON request_items;
DROP FUNCTION IF EXISTS sync_relief_request_status();
