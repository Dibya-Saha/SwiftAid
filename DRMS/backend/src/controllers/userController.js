const pool = require('../db');

async function listVolunteers(req, res) {
  try {
    const result = await pool.query(
      `SELECT user_id, name AS full_name, email
       FROM users
       WHERE LOWER(role) = 'volunteer'
         AND user_id NOT IN (SELECT user_id FROM team_members)
       ORDER BY name`
    );
    return res.json({ volunteers: result.rows });
  } catch (err) {
    console.error('[users/volunteers] error:', err);
    return res.status(500).json({ message: 'Failed to load volunteers' });
  }
}

module.exports = { listVolunteers };
