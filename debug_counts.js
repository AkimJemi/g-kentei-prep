import pkg from 'pg';
const { Pool } = pkg;

const connectionString = 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function check() {
    try {
        console.log("--- G-Kentei Questions ---");
        const gRes = await pool.query('SELECT category, count(*) FROM g_kentei_questions GROUP BY category');
        console.log(JSON.stringify(gRes.rows, null, 2));

        console.log("\n--- TOEIC Questions ---");
        const tRes = await pool.query('SELECT category, count(*) FROM toeic_questions GROUP BY category');
        console.log(JSON.stringify(tRes.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
