require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const authRoutes = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const userRoutes = require('./routes/userRoutes');
const shelterRoutes = require('./routes/shelterRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');
const itemRoutes = require('./routes/itemRoutes');
const victimRoutes = require('./routes/victimRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const donationRoutes = require('./routes/donationRoutes');
const reliefRequestRoutes = require('./routes/reliefRequestRoutes');
const shelterInventoryRoutes = require('./routes/shelterInventoryRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Quick sanity check: confirms the API is up AND can reach Postgres
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'unreachable', error: err.message });
  }
});

const disasterRoutes = require('./routes/disasterRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/disasters', disasterRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shelters', shelterRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/victims', victimRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/relief-requests', reliefRequestRoutes);
app.use('/api/shelter-inventory', shelterInventoryRoutes);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[server] DRMS API running on http://localhost:${PORT}`);
});
