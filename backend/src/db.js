// Single shared connection pool to local Postgres.
// Every controller imports this instead of opening its own connection.
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('[db] connected to Postgres');
});

pool.on('error', (err) => {
  console.error('[db] unexpected error on idle client', err);
});

module.exports = pool;
