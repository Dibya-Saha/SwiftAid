const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const {
  INSERT_USER,
  SELECT_USER_BY_EMAIL,
  UPDATE_PASSWORD_HASH,
  SELECT_USER_BY_ID,
  UPSERT_VERIFICATION_CODE,
  GET_VERIFICATION_CODE,
  BUMP_CODE_ATTEMPTS,
  DELETE_VERIFICATION_CODE,
  MARK_EMAIL_VERIFIED,
} = require('../sqls/authSqls');
const { sendVerificationCode } = require('../utils/mailer');

const ALLOWED_ROLES = ['admin', 'donor', 'team', 'volunteer'];
const SALT_ROUNDS = 10;
const CODE_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

function newVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

function signToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// POST /api/auth/register
async function register(req, res) {
  const { full_name, email, password, role, phone } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ message: 'full_name, email, password and role are required' });
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ message: `role must be one of: ${ALLOWED_ROLES.join(', ')}` });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'password must be at least 6 characters' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await client.query(
      INSERT_USER,
      [full_name, email, password_hash, role, phone || null]
    );
    const user = result.rows[0];

    const code = newVerificationCode();
    await client.query(UPSERT_VERIFICATION_CODE, [
      user.user_id,
      await bcrypt.hash(code, SALT_ROUNDS),
    ]);

    await client.query('COMMIT');

    let mailSent = true;
    try {
      await sendVerificationCode(email, code);
    } catch (mailErr) {
      mailSent = false;
      console.error('[auth/register] email failed:', mailErr.message);
    }

    return res.status(201).json({ user, needsVerification: true, mailSent });
  } catch (err) {
    await client.query('ROLLBACK');
    // 23505 = unique_violation (email or phone already taken)
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Email or phone is already registered' });
    }
    console.error('[auth/register] error:', err);
    return res.status(500).json({ message: 'Could not create account' });
  } finally {
    client.release();
  }
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  try {
    const result = await pool.query(
      SELECT_USER_BY_EMAIL,
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatches = isBcryptHash(user.password_hash)
      ? await bcrypt.compare(password, user.password_hash)
      : password === user.password_hash;
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        message: 'Please verify your email before signing in.',
        needsVerification: true,
      });
    }

    // Upgrade legacy plaintext passwords after a successful login.
    if (!isBcryptHash(user.password_hash)) {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(UPDATE_PASSWORD_HASH, [passwordHash, user.user_id]);
        await client.query('COMMIT');
      } catch (updateError) {
        await client.query('ROLLBACK');
        throw updateError;
      } finally {
        client.release();
      }
    }

    const { password_hash, ...safeUser } = user;
    const token = signToken(safeUser);

    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error('[auth/login] error:', err);
    return res.status(500).json({ message: 'Login failed' });
  }
}

// POST /api/auth/verify-email
async function verifyEmail(req, res) {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || '').trim();
  if (!email || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'A valid email and 6-digit code are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(SELECT_USER_BY_EMAIL, [email]);
    const user = found.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Account not found' });
    }
    if (user.email_verified) {
      await client.query('ROLLBACK');
      return res.json({ verified: true, message: 'Email is already verified. You can sign in.' });
    }

    const stored = await client.query(GET_VERIFICATION_CODE, [user.user_id]);
    if (!stored.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No active code. Request a new one.' });
    }
    if (Number(stored.rows[0].attempts) >= CODE_MAX_ATTEMPTS) {
      await client.query('ROLLBACK');
      return res.status(429).json({ message: 'Too many attempts. Request a new code.' });
    }
    if (new Date(stored.rows[0].expires_at).getTime() < Date.now()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Code expired. Request a new one.' });
    }

    const matches = await bcrypt.compare(code, stored.rows[0].code_hash);
    if (!matches) {
      const bumped = await client.query(BUMP_CODE_ATTEMPTS, [user.user_id]);
      await client.query('COMMIT');
      const left = CODE_MAX_ATTEMPTS - Number(bumped.rows[0].attempts);
      return res.status(400).json({ message: `Incorrect code. ${left} attempt(s) left.` });
    }

    const updated = await client.query(MARK_EMAIL_VERIFIED, [user.user_id]);
    await client.query(DELETE_VERIFICATION_CODE, [user.user_id]);
    await client.query('COMMIT');
    const { password_hash, ...safeUser } = updated.rows[0];
    return res.json({ verified: true, user: safeUser });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[auth/verifyEmail] error:', err);
    return res.status(500).json({ message: 'Verification failed' });
  } finally {
    client.release();
  }
}

// POST /api/auth/resend-code
async function resendCode(req, res) {
  const email = normalizeEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(SELECT_USER_BY_EMAIL, [email]);
    const user = found.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Account not found' });
    }
    if (user.email_verified) {
      await client.query('ROLLBACK');
      return res.json({ message: 'Email is already verified. You can sign in.' });
    }

    const stored = await client.query(GET_VERIFICATION_CODE, [user.user_id]);
    if (stored.rows[0]) {
      const elapsed = (Date.now() - new Date(stored.rows[0].last_sent_at).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        await client.query('ROLLBACK');
        return res.status(429).json({
          message: `Wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)}s before requesting a new code.`,
          retryAfter: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed),
        });
      }
    }

    const code = newVerificationCode();
    await client.query(UPSERT_VERIFICATION_CODE, [
      user.user_id,
      await bcrypt.hash(code, SALT_ROUNDS),
    ]);
    await client.query('COMMIT');

    try {
      await sendVerificationCode(email, code);
    } catch (mailErr) {
      console.error('[auth/resendCode] email failed:', mailErr.message);
      return res.status(502).json({ message: 'Could not send the email. Check mail configuration and try again.' });
    }
    return res.json({ message: 'A new verification code was sent.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[auth/resendCode] error:', err);
    return res.status(500).json({ message: 'Could not resend the code' });
  } finally {
    client.release();
  }
}

// GET /api/auth/me
async function me(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing authorization token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      SELECT_USER_BY_ID,
      [decoded.user_id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User no longer exists' });
    }

    return res.json({ user });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error('[auth/me] error:', err);
    return res.status(500).json({ message: 'Could not load profile' });
  }
}

module.exports = { register, login, me, verifyEmail, resendCode, ALLOWED_ROLES };
