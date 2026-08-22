-- Store the administrator's explanation when reviewing a team.
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS review_remark TEXT;
