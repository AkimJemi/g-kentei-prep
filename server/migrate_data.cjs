const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../gkentei.db');
const QUESTIONS_FILE = path.join(__dirname, '../src/data/questions.ts.bak');
const TEMP_FILE = path.join(__dirname, 'temp_questions.cjs');

console.log('Migrating questions from file to database...');

// Ensure database connection
const db = new Database(DB_PATH);

try {
    // Create table if not exists
    db.exec(`
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY,
            category TEXT,
            question TEXT,
            options TEXT, -- JSON string
            correctAnswer INTEGER,
            explanation TEXT,
            translations TEXT, -- JSON string
            source TEXT DEFAULT 'system',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

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

    let count = 0;
    const insertMany = db.transaction((questions) => {
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

    // Execute transaction
    insertMany(questions);
    
    console.log(`Successfully migrated ${count} questions to the database.`);

    // Cleanup
    fs.unlinkSync(TEMP_FILE);

} catch (err) {
    console.error('Migration failed:', err);
} finally {
    db.close();
}
