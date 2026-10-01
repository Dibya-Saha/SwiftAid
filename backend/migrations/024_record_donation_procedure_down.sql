-- Rollback for 024_record_donation_procedure.sql

DROP PROCEDURE IF EXISTS record_donation(INT, INT, JSONB, INT[]);
