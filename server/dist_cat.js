import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db', ssl: { rejectUnauthorized: false }});
pool.query('SELECT DISTINCT category FROM g_kentei_questions').then(r => console.log(r.rows)).catch(console.error).finally(()=>pool.end());
