import pkg from 'pg';
const { Pool } = pkg;

const connectionString = 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db';
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function getQuestions() {
  try {
    const res = await pool.query('SELECT id, question, options, explanation FROM g_kentei_questions WHERE optionExplanations IS NULL OR optionExplanations = $1 ORDER BY id LIMIT 50', ['[]']);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

getQuestions();
