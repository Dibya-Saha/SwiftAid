const express = require('express');
const { createDisaster } = require('../controllers/disasterController');

const router = express.Router();

router.post('/', createDisaster);

module.exports = router;
