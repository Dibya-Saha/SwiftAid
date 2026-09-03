-- Preserve operational history when records are removed from active use.

ALTER TABLE shelters ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE items ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE victims ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_shelters_active ON shelters(shelter_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(warehouse_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_active ON items(item_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_victims_active ON victims(victim_id) WHERE archived_at IS NULL;
