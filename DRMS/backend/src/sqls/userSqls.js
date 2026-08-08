const LIST_VOLUNTEERS = `SELECT user_id, name AS full_name, email
  FROM users
  WHERE LOWER(role) = 'volunteer'
    AND user_id NOT IN (SELECT user_id FROM team_members)
  ORDER BY name`;

module.exports = { LIST_VOLUNTEERS };
