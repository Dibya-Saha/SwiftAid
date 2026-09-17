-- Store exact map coordinates independently for every shelter and warehouse.

ALTER TABLE shelters
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

ALTER TABLE warehouses
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shelters_latitude_range') THEN
    ALTER TABLE shelters ADD CONSTRAINT shelters_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shelters_longitude_range') THEN
    ALTER TABLE shelters ADD CONSTRAINT shelters_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouses_latitude_range') THEN
    ALTER TABLE warehouses ADD CONSTRAINT warehouses_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouses_longitude_range') THEN
    ALTER TABLE warehouses ADD CONSTRAINT warehouses_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shelters_coordinates ON shelters(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warehouses_coordinates ON warehouses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
