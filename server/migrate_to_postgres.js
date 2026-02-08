import Database from 'better-sqlite3';
import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../gkentei.db');

// SQLite connection
const sqlite = new Database(dbPath, { readonly: true });

// PostgreSQL connection
const connectionString = 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db';
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function migrateData() {
  console.log('[Migration] Starting data migration from SQLite to PostgreSQL...');
  
  try {
    // Migrate questions
    console.log('[Migration] Migrating questions...');
    const questions = sqlite.prepare('SELECT * FROM questions').all();
    console.log(`[Migration] Found ${questions.length} questions in SQLite`);
    
    for (const q of questions) {
      try {
        await pool.query(`
          INSERT INTO g_kentei_questions (id, category, question, options, correctAnswer, explanation, translations, source)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [
          q.id,
          q.category,
          q.question,
          q.options,
          q.correctAnswer,
          q.explanation,
          q.translations || '{}',
          q.source || 'system'
        ]);
      } catch (err) {
        console.error(`[Migration] Failed to insert question ${q.id}:`, err.message);
      }
    }
    console.log('[Migration] Questions migrated successfully');
    
    // Verify migration
    const result = await pool.query('SELECT COUNT(*) as count FROM g_kentei_questions');
    console.log(`[Migration] Total questions in PostgreSQL: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
  } finally {
    sqlite.close();
    await pool.end();
  }
}

migrateData();
