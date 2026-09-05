-- Item-level warehouse-to-shelter distribution records.

CREATE TABLE IF NOT EXISTS distribution_items (
  distribution_item_id SERIAL PRIMARY KEY,
  distribution_id INT NOT NULL REFERENCES distributions(distribution_id) ON DELETE CASCADE,
  request_item_id INT NOT NULL REFERENCES request_items(request_item_id),
  item_id INT NOT NULL REFERENCES items(item_id),
  quantity INT NOT NULL CHECK (quantity > 0)
);

ALTER TABLE distributions
  ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP;

ALTER TABLE distributions
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_distribution_items_distribution
  ON distribution_items(distribution_id);

CREATE INDEX IF NOT EXISTS idx_distributions_team
  ON distributions(assigned_team_id, status);
