const INSERT_USER = `INSERT INTO users (full_name, email, password_hash, role, phone)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING user_id, full_name, email, LOWER(role) AS role, phone, email_verified`;

const SELECT_USER_BY_EMAIL = `SELECT user_id, full_name, email, password_hash, LOWER(role) AS role, phone, email_verified
  FROM users WHERE email = $1`;

const UPDATE_PASSWORD_HASH = 'UPDATE users SET password_hash = $1 WHERE user_id = $2';

const SELECT_USER_BY_ID = `SELECT user_id, full_name, email, LOWER(role) AS role, phone, email_verified FROM users WHERE user_id = $1`;

const UPSERT_VERIFICATION_CODE = `INSERT INTO email_verification_codes (user_id, code_hash, expires_at, attempts, last_sent_at)
  VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '15 minutes', 0, CURRENT_TIMESTAMP)
  ON CONFLICT (user_id)
  DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at,
    attempts = 0, last_sent_at = CURRENT_TIMESTAMP
  RETURNING expires_at, last_sent_at`;

const GET_VERIFICATION_CODE = `SELECT user_id, code_hash, expires_at, attempts, last_sent_at
  FROM email_verification_codes WHERE user_id = $1`;

const BUMP_CODE_ATTEMPTS = `UPDATE email_verification_codes
  SET attempts = attempts + 1 WHERE user_id = $1
  RETURNING attempts`;

const DELETE_VERIFICATION_CODE = `DELETE FROM email_verification_codes WHERE user_id = $1`;

const MARK_EMAIL_VERIFIED = `UPDATE users SET email_verified = TRUE
  WHERE user_id = $1 RETURNING user_id, full_name, email, LOWER(role) AS role, phone, email_verified`;

module.exports = {
  INSERT_USER,
  SELECT_USER_BY_EMAIL,
  UPDATE_PASSWORD_HASH,
  SELECT_USER_BY_ID,
  UPSERT_VERIFICATION_CODE,
  GET_VERIFICATION_CODE,
  BUMP_CODE_ATTEMPTS,
  DELETE_VERIFICATION_CODE,
  MARK_EMAIL_VERIFIED,
};
