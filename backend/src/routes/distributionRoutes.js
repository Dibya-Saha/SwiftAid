const express = require('express');
const { createDistribution, listDistributions, listMyDistributions, updateDistributionStatus } = require('../controllers/distributionController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.post('/', requireAuth, requireRole('admin'), createDistribution);
router.get('/', requireAuth, requireRole('admin'), listDistributions);
router.get('/mine', requireAuth, requireRole('team'), listMyDistributions);
router.patch('/:id/status', requireAuth, updateDistributionStatus);

module.exports = router;
