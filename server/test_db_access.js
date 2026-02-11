import pkg from 'pg';
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL || 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    const res = await pool.query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'');
    console.log('Tables Found:', res.rows.map(r => r.tablename));
    
    const subRes = await pool.query('SELECT count(*) FROM subscriptions');
    console.log('Subscription Count:', subRes.rows[0].count);
  } catch (err) {
    console.error('Database Test Error:', err.message);
  } finally {
    await pool.end();
  }
}

test();
