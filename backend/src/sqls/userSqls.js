const LIST_VOLUNTEERS = `SELECT user_id, full_name, email
  FROM users
  WHERE LOWER(role) = 'volunteer'
    AND user_id NOT IN (SELECT user_id FROM team_members)
  ORDER BY full_name`;

module.exports = { LIST_VOLUNTEERS };
