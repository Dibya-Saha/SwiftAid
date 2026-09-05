-- Track shelter stock thresholds and every stock adjustment.

ALTER TABLE shelter_inventory
  ADD COLUMN IF NOT EXISTS minimum_quantity INT NOT NULL DEFAULT 0
  CHECK (minimum_quantity >= 0);

ALTER TABLE shelter_inventory
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS shelter_inventory_movements (
  movement_id SERIAL PRIMARY KEY,
  shelter_id INT NOT NULL REFERENCES shelters(shelter_id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES items(item_id),
  quantity INT NOT NULL CHECK (quantity > 0),
  operation VARCHAR(10) NOT NULL CHECK (operation IN ('add', 'remove')),
  reason TEXT,
  created_by INT NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shelter_inventory_movements_shelter
  ON shelter_inventory_movements(shelter_id, created_at DESC);
