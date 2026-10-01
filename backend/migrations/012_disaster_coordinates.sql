-- Store exact map coordinates on each disaster, mirroring shelters/warehouses (011).

ALTER TABLE disasters
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disasters_latitude_range') THEN
    ALTER TABLE disasters ADD CONSTRAINT disasters_latitude_range CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disasters_longitude_range') THEN
    ALTER TABLE disasters ADD CONSTRAINT disasters_longitude_range CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_disasters_coordinates ON disasters(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
