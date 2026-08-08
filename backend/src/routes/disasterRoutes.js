const express = require('express');
const { createDisaster, listDisasters, updateDisasterStatus } = require('../controllers/disasterController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, listDisasters);
router.post('/', requireAuth, requireRole('admin'), createDisaster);
router.patch('/:id/status', requireAuth, requireRole('admin'), updateDisasterStatus);

module.exports = router;
