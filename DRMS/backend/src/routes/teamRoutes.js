const express = require('express');
const { createTeam, listMine, listPending, listAll, reviewTeam, leaveTeam, disbandTeam } = require('../controllers/teamController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), listAll);
router.post('/', requireAuth, requireRole('team'), createTeam);
router.get('/mine', requireAuth, listMine);
router.get('/pending', requireAuth, requireRole('admin'), listPending);
router.post('/:id/:action(approve|reject)', requireAuth, requireRole('admin'), reviewTeam);
router.delete('/:id/members/me', requireAuth, requireRole('volunteer'), leaveTeam);
router.delete('/:id', requireAuth, requireRole('team'), disbandTeam);

module.exports = router;
