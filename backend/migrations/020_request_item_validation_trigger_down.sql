-- Rollback for 020_request_item_validation_trigger.sql

DROP TRIGGER IF EXISTS trg_validate_request_item_dispatched ON request_items;
DROP FUNCTION IF EXISTS validate_request_item_dispatched();
