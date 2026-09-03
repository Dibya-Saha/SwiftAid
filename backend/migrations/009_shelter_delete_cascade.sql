-- Allow an admin to remove a shelter and all records owned by that shelter.
-- The dependent records are deleted atomically by PostgreSQL.

ALTER TABLE victims
  DROP CONSTRAINT IF EXISTS victims_shelter_id_fkey;
ALTER TABLE victims
  ADD CONSTRAINT victims_shelter_id_fkey
  FOREIGN KEY (shelter_id) REFERENCES shelters(shelter_id) ON DELETE CASCADE;

ALTER TABLE relief_requests
  DROP CONSTRAINT IF EXISTS relief_requests_shelter_id_fkey;
ALTER TABLE relief_requests
  ADD CONSTRAINT relief_requests_shelter_id_fkey
  FOREIGN KEY (shelter_id) REFERENCES shelters(shelter_id) ON DELETE CASCADE;

ALTER TABLE distributions
  DROP CONSTRAINT IF EXISTS distributions_request_id_fkey;
ALTER TABLE distributions
  ADD CONSTRAINT distributions_request_id_fkey
  FOREIGN KEY (request_id) REFERENCES relief_requests(request_id) ON DELETE CASCADE;

ALTER TABLE distribution_items
  DROP CONSTRAINT IF EXISTS distribution_items_request_item_id_fkey;
ALTER TABLE distribution_items
  ADD CONSTRAINT distribution_items_request_item_id_fkey
  FOREIGN KEY (request_item_id) REFERENCES request_items(request_item_id) ON DELETE CASCADE;

-- Older 006 versions allowed direct shelter donations. They are legacy
-- shelter-owned records, so remove them with the shelter instead of trying
-- to SET NULL and violating the old donations_location_check constraint.
ALTER TABLE donations
  DROP CONSTRAINT IF EXISTS donations_location_check;

ALTER TABLE donations
  DROP CONSTRAINT IF EXISTS donations_shelter_id_fkey;
ALTER TABLE donations
  ADD CONSTRAINT donations_shelter_id_fkey
  FOREIGN KEY (shelter_id) REFERENCES shelters(shelter_id) ON DELETE CASCADE;
