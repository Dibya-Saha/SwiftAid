-- Shelter inventory for supplies received through warehouse distributions.
-- Independent per shelter, analogous to warehouse inventory.

CREATE TABLE IF NOT EXISTS shelter_inventory (
  shelter_inventory_id SERIAL PRIMARY KEY,
  shelter_id INT NOT NULL REFERENCES shelters(shelter_id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES items(item_id),
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  UNIQUE (shelter_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_shelter_inventory_shelter ON shelter_inventory(shelter_id);
    