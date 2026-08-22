const pool = require('../db');
const {
  TEAMS_QUERY,
  TEAMS_GROUP_ORDER,
  TEAM_FILTERS,
  MEMBERSHIP_BY_USER,
  VOLUNTEERS_BY_IDS,
  MEMBERSHIPS_BY_IDS,
  INSERT_TEAM,
  INSERT_LEADER_MEMBER,
  INSERT_MEMBER_ROWS,
  UPDATE_TEAM_STATUS,
  DELETE_MEMBERS_BY_TEAM,
  DELETE_MEMBER_ROW,
  LEADER_ROW_BY_TEAM,
  DISBAND_TEAM,
} = require('../sqls/teamSqls');

const TEAM_TYPES = ['medical', 'rescue', 'logistics', 'distribution', 'general'];

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
      MEMBERSHIP_BY_USER,
      [req.user.user_id]
    );
    if (leaderMembership.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'You already belong to a team. Disband your current team before creating a new one' });
    }

    if (volunteerIds.length) {
      const volunteers = await client.query(
        VOLUNTEERS_BY_IDS,
        [volunteerIds]
      );
      if (volunteers.rowCount !== volunteerIds.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'One or more selected users are not available volunteers' });
      }

      const assigned = await client.query(
        MEMBERSHIPS_BY_IDS,
        [volunteerIds]
      );
      if (assigned.rowCount) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'One or more selected volunteers already belong to a team' });
      }
    }

    const teamResult = await client.query(
      INSERT_TEAM,
      [team_name.trim(), String(team_type).toLowerCase(), req.user.user_id]
    );
    const team = teamResult.rows[0];
    await client.query(
      INSERT_LEADER_MEMBER,
      [team.team_id, req.user.user_id]
    );
    if (volunteerIds.length) {
      await client.query(
        INSERT_MEMBER_ROWS,
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
    const filters = TEAM_FILTERS[mode];
    const values = mode === 'mine' ? [req.user.user_id] : [];
    const result = await pool.query(`${TEAMS_QUERY} ${filters} ${TEAMS_GROUP_ORDER}`, values);
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
  const reviewRemark = typeof req.body.remark === 'string' ? req.body.remark.trim() : '';
  if (status === 'rejected' && !reviewRemark) {
    return res.status(400).json({ message: 'A rejection reason is required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      UPDATE_TEAM_STATUS,
      [status, req.user.user_id, req.params.id, reviewRemark || null]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Team not found' });
    }
    if (status === 'rejected') {
      await client.query(DELETE_MEMBERS_BY_TEAM, [req.params.id]);
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
      DELETE_MEMBER_ROW,
      [id, req.user.user_id]
    );
    if (!result.rows[0]) {
      const isLeader = await pool.query(
        LEADER_ROW_BY_TEAM,
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
      DISBAND_TEAM,
      [id, req.user.user_id]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Team not found or you are not its leader' });
    }
    await client.query(DELETE_MEMBERS_BY_TEAM, [id]);
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
