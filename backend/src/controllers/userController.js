const pool = require('../db');
const { LIST_VOLUNTEERS } = require('../sqls/userSqls');

async function listVolunteers(req, res) {
  try {
    const result = await pool.query(LIST_VOLUNTEERS);
    return res.json({ volunteers: result.rows });
  } catch (err) {
    console.error('[users/volunteers] error:', err);
    return res.status(500).json({ message: 'Failed to load volunteers' });
  }
}

module.exports = { listVolunteers };
