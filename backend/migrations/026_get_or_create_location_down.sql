-- Rollback for 026_get_or_create_location.sql

DROP FUNCTION IF EXISTS get_or_create_location(VARCHAR, VARCHAR, VARCHAR, VARCHAR);
