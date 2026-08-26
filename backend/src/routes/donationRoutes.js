const express = require('express');
const {
  createDonation,
  listMyDonations,
  listDonations,
  getDonation,
} = require('../controllers/donationController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, requireRole('donor'), createDonation);
router.get('/mine', requireAuth, requireRole('donor'), listMyDonations);
router.get('/', requireAuth, requireRole('admin'), listDonations);
router.get('/:id', requireAuth, getDonation);

module.exports = router;
