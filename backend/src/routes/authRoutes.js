const express = require('express');
const { register, login, me, verifyEmail, resendCode } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-code', resendCode);
router.get('/me', me);

module.exports = router;
