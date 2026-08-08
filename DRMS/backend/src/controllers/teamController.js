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

    const leaderMembership = await client.query(
      'SELECT 1 FROM team_members WHERE user_id = $1',
      [req.user.user_id]
    );
    if (leaderMembership.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'You already belong to a team. Disband your current team before creating a new one' });
    }

    if (volunteerIds.length) {
      const volunteers = await client.query(
        `SELECT user_id FROM users WHERE user_id = ANY($1::int[]) AND LOWER(role) = 'volunteer'`,
        [volunteerIds]
      );
      if (volunteers.rowCount !== volunteerIds.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'One or more selected users are not available volunteers' });
      }

      const assigned = await client.query(
        'SELECT user_id FROM team_members WHERE user_id = ANY($1::int[])',
        [volunteerIds]
      );
      if (assigned.rowCount) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'One or more selected volunteers already belong to a team' });
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

async function listTeams(req, res, mode = 'mine') {
  try {
    const filters = {
      mine: `WHERE t.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1) OR t.leader_id = $1`,
      pending: `WHERE LOWER(t.status) = 'pending_approval'`,
      all: ``,
    }[mode];
    const values = mode === 'mine' ? [req.user.user_id] : [];
    const result = await pool.query(`${teamsQuery} ${filters} GROUP BY t.team_id, leader.name ORDER BY t.team_id DESC`, values);
    return res.json({ teams: result.rows });
  } catch (err) {
    console.error('[teams/list] error:', err);
    return res.status(500).json({ message: 'Failed to load teams' });
  }
}

async function listMine(req, res) {
  return listTeams(req, res, 'mine');
}

async function listPending(req, res) {
  return listTeams(req, res, 'pending');
}

async function listAll(req, res) {
  return listTeams(req, res, 'all');
}

async function reviewTeam(req, res) {
  const status = req.params.action === 'approve' ? 'approved' : 'rejected';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE teams SET status = $1, approved_by_admin_id = $2 WHERE team_id = $3
       RETURNING team_id, team_name, team_type, status, leader_id, approved_by_admin_id`,
      [status, req.user.user_id, req.params.id]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Team not found' });
    }
    if (status === 'rejected') {
      await client.query('DELETE FROM team_members WHERE team_id = $1', [req.params.id]);
    }
    await client.query('COMMIT');
    return res.json({ team: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[teams/review] error:', err);
    return res.status(500).json({ message: 'Failed to review team' });
  } finally {
    client.release();
  }
}

async function leaveTeam(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM team_members
       WHERE team_id = $1 AND user_id = $2 AND LOWER(member_role) = 'member'
       RETURNING team_id`,
      [id, req.user.user_id]
    );
    if (!result.rows[0]) {
      const isLeader = await pool.query(
        `SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2 AND LOWER(member_role) = 'leader'`,
        [id, req.user.user_id]
      );
      if (isLeader.rowCount) {
        return res.status(409).json({ message: 'Team leaders cannot resign. Disband the team instead' });
      }
      return res.status(404).json({ message: 'You are not a member of this team' });
    }
    return res.json({ message: 'You have resigned from the team' });
  } catch (err) {
    console.error('[teams/leave] error:', err);
    return res.status(500).json({ message: 'Failed to resign from team' });
  }
}

async function disbandTeam(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE teams SET status = 'disbanded' WHERE team_id = $1 AND leader_id = $2 AND status <> 'disbanded'
       RETURNING team_id, team_name, team_type, status, leader_id`,
      [id, req.user.user_id]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Team not found or you are not its leader' });
    }
    await client.query('DELETE FROM team_members WHERE team_id = $1', [id]);
    await client.query('COMMIT');
    return res.json({ team: result.rows[0], message: 'Team disbanded' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[teams/disband] error:', err);
    return res.status(500).json({ message: 'Failed to disband team' });
  } finally {
    client.release();
  }
}

module.exports = { createTeam, listMine, listPending, listAll, reviewTeam, leaveTeam, disbandTeam, TEAM_TYPES };
