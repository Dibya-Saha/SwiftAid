const INSERT_USER = `INSERT INTO users (full_name, email, password_hash, role, phone)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING user_id, full_name, email, LOWER(role) AS role, phone`;

const SELECT_USER_BY_EMAIL = `SELECT user_id, full_name, email, password_hash, LOWER(role) AS role, phone
  FROM users WHERE email = $1`;

const UPDATE_PASSWORD_HASH = 'UPDATE users SET password_hash = $1 WHERE user_id = $2';

const SELECT_USER_BY_ID = `SELECT user_id, full_name, email, LOWER(role) AS role, phone FROM users WHERE user_id = $1`;

module.exports = {
  INSERT_USER,
  SELECT_USER_BY_EMAIL,
  UPDATE_PASSWORD_HASH,
  SELECT_USER_BY_ID,
};
