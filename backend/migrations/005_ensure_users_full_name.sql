-- Migration 005: Ensure users.full_name column exists
-- This script is idempotent: it renames 'name' to 'full_name' if necessary,
-- adds 'full_name' if missing, and ensures all users have the new column.

DO $$ 
BEGIN
    -- 1. Rename 'name' to 'full_name' if 'name' exists and 'full_name' doesn't
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name') 
       AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='full_name') THEN
        ALTER TABLE users RENAME COLUMN name TO full_name;
    END IF;

    -- 2. Add 'full_name' if it still doesn't exist
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='full_name') THEN
        ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
    END IF;

    -- 3. If both exist (legacy state), backfill 'full_name' from 'name' and drop 'name'
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name') 
       AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='full_name') THEN
        UPDATE users SET full_name = name WHERE full_name IS NULL;
        ALTER TABLE users DROP COLUMN name;
    END IF;
END $$;

--no need to run this migration solved