-- Preserve disaster history when disasters are removed from active use,
-- mirroring the archive pattern from 010_archive_records.sql.

ALTER TABLE disasters ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_disasters_active ON disasters(disaster_id) WHERE archived_at IS NULL;
