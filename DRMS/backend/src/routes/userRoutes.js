const express = require('express');
const { listVolunteers } = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.get('/volunteers', requireAuth, listVolunteers);

module.exports = router;
