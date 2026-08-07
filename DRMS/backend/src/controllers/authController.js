const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const ALLOWED_ROLES = ['admin', 'donor', 'team', 'volunteer'];
const SALT_ROUNDS = 10;

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

  try {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, role, phone`,
      [full_name, email, password_hash, role, phone || null]
    );

    const user = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({ user, token });
  } catch (err) {
    // 23505 = unique_violation (email or phone already taken)
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Email or phone is already registered' });
    }
    console.error('[auth/register] error:', err);
    return res.status(500).json({ message: 'Could not create account' });
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
      `SELECT user_id, full_name, email, password_hash, role, phone
       FROM users WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const { password_hash, ...safeUser } = user;
    const token = signToken(safeUser);

    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error('[auth/login] error:', err);
    return res.status(500).json({ message: 'Login failed' });
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
      `SELECT user_id, full_name, email, role, phone FROM users WHERE user_id = $1`,
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

module.exports = { register, login, me, ALLOWED_ROLES };
