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

const CATEGORY_MAP = {
  'AI Fundamentals': 'ai_basics',
  'AI Trends': 'ai_trends',
  'Machine Learning': 'ml_methods',
  'Deep Learning Basics': 'dl_overview',
  'Deep Learning Tech': 'dl_methods',
  'AI Applications': 'dl_methods',
  'Social Implementation': 'dl_implementation',
  'Math & Statistics': 'math_stats',
  'Law & Contracts': 'law_contracts',
  'Ethics & Governance': 'ethics_governance',
  'Applied Intelligence': 'ai_basics',
  '機械学習の概要': 'ml_methods'
};

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
        const normalizedCategory = CATEGORY_MAP[q.category] || q.category;
        
        await pool.query(`
          INSERT INTO g_kentei_questions (id, category, question, options, correctAnswer, explanation, translations, source, createdAt, optionExplanations)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            category = EXCLUDED.category,
            question = EXCLUDED.question,
            options = EXCLUDED.options,
            correctAnswer = EXCLUDED.correctAnswer,
            explanation = EXCLUDED.explanation,
            translations = EXCLUDED.translations,
            source = EXCLUDED.source,
            optionExplanations = EXCLUDED.optionExplanations
        `, [
          q.id,
          normalizedCategory,
          q.question,
          typeof q.options === 'string' ? q.options : JSON.stringify(q.options),
          q.correctAnswer,
          q.explanation || '',
          typeof q.translations === 'string' ? q.translations : JSON.stringify(q.translations || {}),
          q.source || 'system',
          q.createdAt || new Date().toISOString(),
          typeof q.optionExplanations === 'string' ? q.optionExplanations : JSON.stringify(q.optionExplanations || [])
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
