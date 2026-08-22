const express = require('express');
const {
  listVictims,
  getVictim,
  createVictim,
  updateVictim,
  deleteVictim,
} = require('../controllers/victimController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, listVictims);
router.get('/:id', requireAuth, getVictim);
router.post('/', requireAuth, requireRole('admin'), createVictim);
router.patch('/:id', requireAuth, requireRole('admin'), updateVictim);
router.delete('/:id', requireAuth, requireRole('admin'), deleteVictim);

module.exports = router;
