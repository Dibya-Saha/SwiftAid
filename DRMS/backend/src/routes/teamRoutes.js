const express = require('express');
const { createTeam, listMine, listPending, reviewTeam } = require('../controllers/teamController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, requireRole('team'), createTeam);
router.get('/mine', requireAuth, listMine);
router.get('/pending', requireAuth, requireRole('admin'), listPending);
router.post('/:id/:action(approve|reject)', requireAuth, requireRole('admin'), reviewTeam);

module.exports = router;
