const express = require('express');
const { reverseGeocode } = require('../controllers/geocodeController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/reverse', requireAuth, requireRole('admin'), reverseGeocode);

module.exports = router;
