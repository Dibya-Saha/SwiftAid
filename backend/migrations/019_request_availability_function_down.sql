-- Rollback for 019_request_availability_function.sql

DROP FUNCTION IF EXISTS request_item_available(INT);
