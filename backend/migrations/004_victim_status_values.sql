-- Keep victim status values limited to the two supported workflow states.
UPDATE victims
SET status = CASE
  WHEN LOWER(status) IN ('safe', 'sheltered') THEN 'relocated'
  ELSE 'registered'
END
WHERE status IS NULL OR LOWER(status) NOT IN ('registered', 'relocated');

ALTER TABLE victims
  ADD CONSTRAINT victims_status_check
  CHECK (status IN ('registered', 'relocated'));
