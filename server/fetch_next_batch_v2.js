import pkg from 'pg';
const { Pool } = pkg;
import { writeFileSync } from 'fs';

const connectionString = 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db';
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function getQuestions() {
  try {
    const res = await pool.query('SELECT id, question, options, explanation FROM g_kentei_questions WHERE id BETWEEN 101 AND 200 ORDER BY id');
    writeFileSync('batch_101_200.json', JSON.stringify(res.rows, null, 2));
    console.log(`Saved ${res.rows.length} questions to batch_101_200.json`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

getQuestions();
