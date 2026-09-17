-- Rollback for 012_disaster_coordinates.sql

DROP INDEX IF EXISTS idx_disasters_coordinates;
ALTER TABLE disasters DROP CONSTRAINT IF EXISTS disasters_longitude_range;
ALTER TABLE disasters DROP CONSTRAINT IF EXISTS disasters_latitude_range;
ALTER TABLE disasters DROP COLUMN IF EXISTS longitude;
ALTER TABLE disasters DROP COLUMN IF EXISTS latitude;
