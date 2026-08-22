const pool = require('../db');
const {
  FIND_LOCATION,
  INSERT_LOCATION,
  INSERT_DISASTER,
  INSERT_DISASTER_LOCATION,
  LIST_DISASTERS,
  UPDATE_DISASTER_STATUS,
} = require('../sqls/disasterSqls');

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
                FIND_LOCATION,
                [division, district, upazila || null, unionName || union_name || null]
            );
            const locationId = locationResult.rows[0]?.location_id || (
                await client.query(
                    INSERT_LOCATION,
                    [division, district, upazila || null, unionName || union_name || null]
                )
            ).rows[0].location_id;

            const disasterResult = await client.query(
                INSERT_DISASTER,
                [title, req.user.user_id]
            );
            const disaster = disasterResult.rows[0];

            await client.query(
                INSERT_DISASTER_LOCATION,
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
        const result = await pool.query(LIST_DISASTERS);
        return res.json({ disasters: result.rows });
    } catch (err) {
        console.error('[disasters/list] error:', err);
        return res.status(500).json({ message: 'Failed to load disasters' });
    }
}

// PATCH /api/disasters/:id/status
async function updateDisasterStatus(req, res) {
    const statuses = ['ACTIVE', 'CLOSED'];
    const status = String(req.body.status || '').toUpperCase();
    if (!statuses.includes(status)) {
        return res.status(400).json({ message: `status must be one of: ${statuses.join(', ')}` });
    }

    try {
        const result = await pool.query(
            UPDATE_DISASTER_STATUS,
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
