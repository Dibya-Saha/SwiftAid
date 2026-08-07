const pool = require('../db');
const jwt = require('jsonwebtoken');

// POST /api/disasters
async function createDisaster(req, res) {
    const { title, division, district } = req.body;
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) return res.status(401).json({ message: 'Missing token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ message: 'Must be admin' });

        if (!title || !division || !district) {
            return res.status(400).json({ message: 'Title, division, and district are required' });
        }

        // 1. Create Location
        const locResult = await pool.query(
            `INSERT INTO locations (division, district) VALUES ($1, $2) RETURNING location_id`,
            [division, district]
        );
        const location_id = locResult.rows[0].location_id;

        // 2. Create Disaster
        const disResult = await pool.query(
            `INSERT INTO disasters (title, status, start_date, created_by_admin_id) VALUES ($1, $2, NOW(), $3) RETURNING disaster_id`,
            [title, 'ACTIVE', decoded.user_id]
        );
        const disaster_id = disResult.rows[0].disaster_id;

        // 3. Link them in join table
        await pool.query(
            `INSERT INTO disaster_locations (disaster_id, location_id) VALUES ($1, $2)`,
            [disaster_id, location_id]
        );

        return res.status(201).json({ message: 'Disaster created successfully!' });
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        console.error('[disasters/create] error:', err);
        return res.status(500).json({ message: 'Failed to create disaster' });
    }
}

module.exports = { createDisaster };
