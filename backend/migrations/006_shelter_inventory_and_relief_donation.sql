-- Shelter inventory to hold supplies donated via relief requests.
-- Independent per shelter, analogous to warehouse inventory.

CREATE TABLE IF NOT EXISTS shelter_inventory (
  shelter_inventory_id SERIAL PRIMARY KEY,
  shelter_id INT NOT NULL REFERENCES shelters(shelter_id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES items(item_id),
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  UNIQUE (shelter_id, item_id)
);

-- Extend donations to support relief-request based shelter donations
-- without breaking existing warehouse donations.
-- Make warehouse_id nullable and add shelter/request linkage.

ALTER TABLE donations ALTER COLUMN warehouse_id DROP NOT NULL;

ALTER TABLE donations ADD COLUMN IF NOT EXISTS shelter_id INT REFERENCES shelters(shelter_id) ON DELETE SET NULL;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS request_id INT REFERENCES relief_requests(request_id) ON DELETE SET NULL;

-- Ensure at least one of warehouse_id or shelter_id is set
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donations_location_check') THEN
    ALTER TABLE donations ADD CONSTRAINT donations_location_check CHECK (warehouse_id IS NOT NULL OR shelter_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shelter_inventory_shelter ON shelter_inventory(shelter_id);
CREATE INDEX IF NOT EXISTS idx_donations_request ON donations(request_id);
CREATE INDEX IF NOT EXISTS idx_donations_shelter ON donations(shelter_id);
