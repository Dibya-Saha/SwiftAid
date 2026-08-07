const pool = require('../db');

// POST /api/disasters
async function createDisaster(req, res) {
    const { title, division, district, upazila, union: unionName, union_name } = req.body;
    try {
        if (!title || !division || !district) {
            return res.status(400).json({ message: 'Title, division, and district are required' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const locationResult = await client.query(
                `SELECT location_id FROM locations
                 WHERE division = $1 AND district = $2
                   AND upazila IS NOT DISTINCT FROM $3
                   AND union_name IS NOT DISTINCT FROM $4
                 LIMIT 1`,
                [division, district, upazila || null, unionName || union_name || null]
            );
            const locationId = locationResult.rows[0]?.location_id || (
                await client.query(
                    `INSERT INTO locations (division, district, upazila, union_name)
                     VALUES ($1, $2, $3, $4) RETURNING location_id`,
                    [division, district, upazila || null, unionName || union_name || null]
                )
            ).rows[0].location_id;

            const disasterResult = await client.query(
                `INSERT INTO disasters (title, status, start_date, created_by_admin_id)
                 VALUES ($1, 'ACTIVE', CURRENT_DATE, $2)
                 RETURNING disaster_id, title, status, start_date`,
                [title, req.user.user_id]
            );
            const disaster = disasterResult.rows[0];

            await client.query(
                `INSERT INTO disaster_locations (disaster_id, location_id) VALUES ($1, $2)`,
                [disaster.disaster_id, locationId]
            );
            await client.query('COMMIT');
            return res.status(201).json({ disaster: { ...disaster, location_id: locationId } });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[disasters/create] error:', err);
        return res.status(500).json({ message: 'Failed to create disaster' });
    }
}

// GET /api/disasters
async function listDisasters(req, res) {
    try {
        const result = await pool.query(
            `SELECT d.disaster_id, d.title, d.status, d.start_date,
                    COALESCE(json_agg(json_build_object(
                        'location_id', l.location_id,
                        'division', l.division,
                        'district', l.district,
                        'upazila', l.upazila,
                        'union_name', l.union_name
                    ) ORDER BY l.location_id) FILTER (WHERE l.location_id IS NOT NULL), '[]') AS locations
             FROM disasters d
             LEFT JOIN disaster_locations dl ON dl.disaster_id = d.disaster_id
             LEFT JOIN locations l ON l.location_id = dl.location_id
             GROUP BY d.disaster_id
             ORDER BY d.start_date DESC, d.disaster_id DESC`
        );
        return res.json({ disasters: result.rows });
    } catch (err) {
        console.error('[disasters/list] error:', err);
        return res.status(500).json({ message: 'Failed to load disasters' });
    }
}

// PATCH /api/disasters/:id/status
async function updateDisasterStatus(req, res) {
    const statuses = ['ACTIVE', 'ONGOING', 'RESOLVED', 'CLOSED'];
    const status = String(req.body.status || '').toUpperCase();
    if (!statuses.includes(status)) {
        return res.status(400).json({ message: `status must be one of: ${statuses.join(', ')}` });
    }

    try {
        const result = await pool.query(
            `UPDATE disasters SET status = $1 WHERE disaster_id = $2
             RETURNING disaster_id, title, status, start_date`,
            [status, req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ message: 'Disaster not found' });
        return res.json({ disaster: result.rows[0] });
    } catch (err) {
        console.error('[disasters/status] error:', err);
        return res.status(500).json({ message: 'Failed to update disaster status' });
    }
}

module.exports = { createDisaster, listDisasters, updateDisasterStatus };
