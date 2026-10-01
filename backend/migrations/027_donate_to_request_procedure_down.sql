-- Rollback for 027_donate_to_request_procedure.sql

DROP PROCEDURE IF EXISTS donate_to_request(INT, INT, JSONB, INT[]);
