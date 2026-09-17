-- Rollback for 011_facility_coordinates.sql.
-- This permanently removes saved map coordinates.

DROP INDEX IF EXISTS idx_shelters_coordinates;
DROP INDEX IF EXISTS idx_warehouses_coordinates;

ALTER TABLE shelters
  DROP CONSTRAINT IF EXISTS shelters_latitude_range,
  DROP CONSTRAINT IF EXISTS shelters_longitude_range,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude;

ALTER TABLE warehouses
  DROP CONSTRAINT IF EXISTS warehouses_latitude_range,
  DROP CONSTRAINT IF EXISTS warehouses_longitude_range,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude;
