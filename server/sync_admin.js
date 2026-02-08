import pkg from 'pg';
const { Pool } = pkg;

const connectionString = 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function updateAdmin() {
  try {
    const client = await pool.connect();
    console.log('Syncing Admin Users...');
    
    // Check for 'akim'
    const akimCheck = await client.query("SELECT * FROM g_kentei_users WHERE userId = 'akim'");
    if (akimCheck.rows.length > 0) {
      console.log('Removing old admin akim...');
      await client.query("DELETE FROM g_kentei_users WHERE userId = 'akim'");
    }
    
    // Check for 'jemin.kim'
    const jeminCheck = await client.query("SELECT * FROM g_kentei_users WHERE userId = 'jemin.kim'");
    if (jeminCheck.rows.length === 0) {
      console.log('Adding new admin jemin.kim...');
      await client.query("INSERT INTO g_kentei_users (userId, nickname, role) VALUES ('jemin.kim', 'Akim', 'admin')");
    } else {
      console.log('jemin.kim already exists.');
    }
    
    client.release();
    console.log('Admin sync complete.');
  } catch (err) {
    console.error('Update failed:', err.message);
  } finally {
    await pool.end();
  }
}

updateAdmin();
