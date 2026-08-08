-- Enforce the single-team rule at the database level:
-- one user can belong to at most one team.
-- Run once against your database (e.g. via Navicat or psql):
--   psql -d postgres -U postgres -f backend/migrations/001_single_team_membership.sql

-- BEGIN;

-- Remove duplicate memberships for any user, keeping the most recent row.
DELETE FROM team_members a
USING team_members b
WHERE a.team_member_id < b.team_member_id
  AND a.user_id = b.user_id;

-- Uniqueness on user_id guarantees a user can never be in more than one team,
-- even when two leaders create teams at the same time.
CREATE UNIQUE INDEX IF NOT EXISTS team_members_user_id_key
  ON team_members (user_id);

COMMIT;
