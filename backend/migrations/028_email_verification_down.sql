-- Rollback for 028_email_verification.sql

DROP TABLE IF EXISTS email_verification_codes;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
