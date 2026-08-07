const pool = require('../db');

const TEAM_TYPES = ['medical', 'rescue', 'logistics', 'distribution', 'general'];

const teamsQuery = `
  SELECT t.team_id, t.team_name, t.team_type, t.status, t.leader_id,
         leader.name AS leader_name,
         COALESCE(json_agg(json_build_object(
           'user_id', member.user_id,
           'name', member.name,
           'email', member.email,
           'role', tm.member_role
         ) ORDER BY tm.member_role DESC, member.name)
         FILTER (WHERE member.user_id IS NOT NULL), '[]') AS members
  FROM teams t
  LEFT JOIN users leader ON leader.user_id = t.leader_id
  LEFT JOIN team_members tm ON tm.team_id = t.team_id
  LEFT JOIN users member ON member.user_id = tm.user_id
`;

async function createTeam(req, res) {
  const { team_name, team_type, volunteer_ids = [] } = req.body;
  if (!team_name || !TEAM_TYPES.includes(String(team_type).toLowerCase())) {
    return res.status(400).json({ message: `team_name and team_type (${TEAM_TYPES.join(', ')}) are required` });
  }
  if (!Array.isArray(volunteer_ids)) {
    return res.status(400).json({ message: 'volunteer_ids must be an array' });
  }

  const volunteerIds = [...new Set(volunteer_ids.map(Number).filter(Number.isInteger))];
  if (volunteerIds.includes(Number(req.user.user_id))) {
    return res.status(400).json({ message: 'The team leader cannot be selected as a volunteer' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (volunteerIds.length) {
      const volunteers = await client.query(
        `SELECT user_id FROM users WHERE user_id = ANY($1::int[]) AND LOWER(role) = 'volunteer'`,
        [volunteerIds]
      );
      if (volunteers.rowCount !== volunteerIds.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'One or more selected users are not available volunteers' });
      }
    }

    const teamResult = await client.query(
      `INSERT INTO teams (team_name, team_type, status, leader_id)
       VALUES ($1, $2, 'pending_approval', $3)
       RETURNING team_id, team_name, team_type, status, leader_id`,
      [team_name.trim(), String(team_type).toLowerCase(), req.user.user_id]
    );
    const team = teamResult.rows[0];
    await client.query(
      `INSERT INTO team_members (team_id, user_id, member_role) VALUES ($1, $2, 'leader')`,
      [team.team_id, req.user.user_id]
    );
    if (volunteerIds.length) {
      await client.query(
        `INSERT INTO team_members (team_id, user_id, member_role)
         SELECT $1, unnest($2::int[]), 'member'`,
        [team.team_id, volunteerIds]
      );
    }
    await client.query('COMMIT');
    return res.status(201).json({ team });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ message: 'A selected volunteer already belongs to a team' });
    console.error('[teams/create] error:', err);
    return res.status(500).json({ message: 'Failed to create team' });
  } finally {
    client.release();
  }
}

async function listTeams(req, res, pendingOnly = false) {
  try {
    const filters = pendingOnly
      ? `WHERE LOWER(t.status) = 'pending_approval'`
      : `WHERE t.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)`;
    const values = pendingOnly ? [] : [req.user.user_id];
    const result = await pool.query(`${teamsQuery} ${filters} GROUP BY t.team_id, leader.name ORDER BY t.team_id DESC`, values);
    return res.json({ teams: result.rows });
  } catch (err) {
    console.error('[teams/list] error:', err);
    return res.status(500).json({ message: 'Failed to load teams' });
  }
}

async function listMine(req, res) {
  return listTeams(req, res);
}

async function listPending(req, res) {
  return listTeams(req, res, true);
}

async function reviewTeam(req, res) {
  const status = req.params.action === 'approve' ? 'approved' : 'rejected';
  try {
    const result = await pool.query(
      `UPDATE teams SET status = $1, approved_by_admin_id = $2 WHERE team_id = $3
       RETURNING team_id, team_name, team_type, status, leader_id, approved_by_admin_id`,
      [status, req.user.user_id, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Team not found' });
    return res.json({ team: result.rows[0] });
  } catch (err) {
    console.error('[teams/review] error:', err);
    return res.status(500).json({ message: 'Failed to review team' });
  }
}

module.exports = { createTeam, listMine, listPending, reviewTeam, TEAM_TYPES };
