const TEAMS_MINE_QUERY = `
  SELECT t.team_id, t.team_name, t.team_type, t.status, t.leader_id, t.review_remark,
         leader.full_name AS leader_name,
         COALESCE(json_agg(json_build_object(
           'user_id', member.user_id,
           'name', member.full_name,
           'email', member.email,
           'role', tm.member_role
         ) ORDER BY tm.member_role DESC, member.full_name)
         FILTER (WHERE member.user_id IS NOT NULL), '[]') AS members
  FROM teams t
  LEFT JOIN users leader ON leader.user_id = t.leader_id
  LEFT JOIN team_members tm ON tm.team_id = t.team_id
  LEFT JOIN users member ON member.user_id = tm.user_id
  WHERE (t.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1) OR t.leader_id = $1)
  GROUP BY t.team_id, leader.full_name
  ORDER BY t.team_id DESC
`;

const TEAMS_PENDING_QUERY = `
  SELECT t.team_id, t.team_name, t.team_type, t.status, t.leader_id, t.review_remark,
         leader.full_name AS leader_name,
         COALESCE(json_agg(json_build_object(
           'user_id', member.user_id,
           'name', member.full_name,
           'email', member.email,
           'role', tm.member_role
         ) ORDER BY tm.member_role DESC, member.full_name)
         FILTER (WHERE member.user_id IS NOT NULL), '[]') AS members
  FROM teams t
  LEFT JOIN users leader ON leader.user_id = t.leader_id
  LEFT JOIN team_members tm ON tm.team_id = t.team_id
  LEFT JOIN users member ON member.user_id = tm.user_id
  WHERE LOWER(t.status) = 'pending_approval'
  GROUP BY t.team_id, leader.full_name
  ORDER BY t.team_id DESC
`;

const TEAMS_ALL_QUERY = `
  SELECT t.team_id, t.team_name, t.team_type, t.status, t.leader_id, t.review_remark,
         leader.full_name AS leader_name,
         COALESCE(json_agg(json_build_object(
           'user_id', member.user_id,
           'name', member.full_name,
           'email', member.email,
           'role', tm.member_role
         ) ORDER BY tm.member_role DESC, member.full_name)
         FILTER (WHERE member.user_id IS NOT NULL), '[]') AS members
  FROM teams t
  LEFT JOIN users leader ON leader.user_id = t.leader_id
  LEFT JOIN team_members tm ON tm.team_id = t.team_id
  LEFT JOIN users member ON member.user_id = tm.user_id
  GROUP BY t.team_id, leader.full_name
  ORDER BY t.team_id DESC
`;

const MEMBERSHIP_BY_USER = 'SELECT 1 FROM team_members WHERE user_id = $1';

const VOLUNTEERS_BY_IDS = `SELECT user_id FROM users WHERE user_id = ANY($1:: int[]) AND LOWER(role) = 'volunteer'`;

const MEMBERSHIPS_BY_IDS = 'SELECT user_id FROM team_members WHERE user_id = ANY($1::int[])';

const INSERT_TEAM = `INSERT INTO teams(team_name, team_type, status, leader_id)
VALUES($1, $2, 'pending_approval', $3)
  RETURNING team_id, team_name, team_type, status, leader_id`;

const INSERT_LEADER_MEMBER = `INSERT INTO team_members(team_id, user_id, member_role) VALUES($1, $2, 'leader')`;

const INSERT_MEMBER_ROWS = `INSERT INTO team_members(team_id, user_id, member_role)
  SELECT $1, unnest($2:: int[]), 'member'`;

const UPDATE_TEAM_STATUS = `UPDATE teams
  SET status = $1, approved_by_admin_id = $2, review_remark = $4
  WHERE team_id = $3
  RETURNING team_id, team_name, team_type, status, leader_id, approved_by_admin_id, review_remark`;

const DELETE_MEMBERS_BY_TEAM = 'DELETE FROM team_members WHERE team_id = $1';

const DELETE_MEMBER_ROW = `DELETE FROM team_members
  WHERE team_id = $1 AND user_id = $2 AND LOWER(member_role) = 'member'
  RETURNING team_id`;

const LEADER_ROW_BY_TEAM = `SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2 AND LOWER(member_role) = 'leader'`;

const DISBAND_TEAM = `UPDATE teams SET status = 'disbanded' WHERE team_id = $1 AND leader_id = $2
  AND LOWER(status) IN('pending_approval', 'approved')
  RETURNING team_id, team_name, team_type, status, leader_id`;

module.exports = {
  TEAMS_MINE_QUERY,
  TEAMS_PENDING_QUERY,
  TEAMS_ALL_QUERY,
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
};
