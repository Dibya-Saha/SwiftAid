-- Link each victim to the disaster associated with their relief case.
-- Run after confirming existing victim rows can be assigned to a disaster.

ALTER TABLE victims
  ADD COLUMN disaster_id INTEGER;

ALTER TABLE victims
  ADD CONSTRAINT victims_disaster_id_fkey
  FOREIGN KEY (disaster_id) REFERENCES disasters(disaster_id);

CREATE INDEX victims_disaster_id_idx ON victims (disaster_id);
