const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../gkentei.db');
const QUESTIONS_FILE = path.join(__dirname, '../src/data/questions.ts');
const TEMP_FILE = path.join(__dirname, 'temp_questions.js');

const db = new Database(DB_PATH);

console.log('Migrating questions from file to database...');

try {
    let content = fs.readFileSync(QUESTIONS_FILE, 'utf8');

    // Remove imports
    content = content.replace(/import .*/g, '');

    // Replace export with module.exports
    // Remove type annotation ': Question[]'
    content = content.replace(/export const questions: Question\[\] =/, 'module.exports =');
    
    // Write to temp file
    fs.writeFileSync(TEMP_FILE, content);

    // Load as JS module
    const questions = require(TEMP_FILE);

    console.log(`Loaded ${questions.length} questions from source file.`);

    const stmt = db.prepare(`
        INSERT OR IGNORE INTO questions (id, category, question, options, correctAnswer, explanation, translations, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((questions) => {
        let count = 0;
        for (const q of questions) {
            const trans = q.translations ? JSON.stringify(q.translations) : '{}';
            const opts = JSON.stringify(q.options);
            
            stmt.run(
                q.id,
                q.category,
                q.question,
                opts,
                q.correctAnswer,
                q.explanation,
                trans,
                'system'
            );
            count++;
        }
        return count;
    });

    const result = insertMany(questions);
    console.log(`Successfully migrated ${result} questions.`);

    // Cleanup
    fs.unlinkSync(TEMP_FILE);

} catch (err) {
    console.error('Migration failed:', err);
} finally {
    db.close();
}
