import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// PostgreSQL connection
const connectionString = 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db';
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function importQuestions() {
  console.log('[Import] Starting question import to PostgreSQL...');
  
  try {
    // Read exported JSON
    const jsonPath = join(__dirname, '../questions_export.json');
    const data = readFileSync(jsonPath, 'utf8');
    const questions = JSON.parse(data);
    
    console.log(`[Import] Found ${questions.length} questions to import`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const q of questions) {
      try {
        await pool.query(`
          INSERT INTO g_kentei_questions (id, category, question, options, correctAnswer, explanation, translations, source, createdAt)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `, [
          q.id,
          q.category,
          q.question,
          q.options,
          q.correctAnswer,
          q.explanation || '',
          q.translations || '{}',
          q.source || 'system',
          q.createdAt || new Date().toISOString()
        ]);
        imported++;
        if (imported % 50 === 0) {
          console.log(`[Import] Imported ${imported}/${questions.length} questions...`);
        }
      } catch (err) {
        console.error(`[Import] Failed to insert question ${q.id}:`, err.message);
        skipped++;
      }
    }
    
    console.log(`[Import] Import complete: ${imported} imported, ${skipped} skipped`);
    
    // Verify import
    const result = await pool.query('SELECT COUNT(*) as count FROM g_kentei_questions');
    console.log(`[Import] Total questions in PostgreSQL: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('[Import] Import failed:', error);
  } finally {
    await pool.end();
  }
}

importQuestions();
