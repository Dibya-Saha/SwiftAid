-- Email verification for authentication: unverified accounts cannot sign in
-- until they confirm a 6-digit code. Existing accounts are backfilled as
-- verified so current users are not locked out.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;

CREATE TABLE IF NOT EXISTS email_verification_codes (
  user_id INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
