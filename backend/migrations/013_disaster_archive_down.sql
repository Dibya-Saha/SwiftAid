-- Rollback for 013_disaster_archive.sql

DROP INDEX IF EXISTS idx_disasters_active;
ALTER TABLE disasters DROP COLUMN IF EXISTS archived_at;
