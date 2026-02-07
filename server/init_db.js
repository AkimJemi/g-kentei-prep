import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../gkentei.db');
const db = new Database(dbPath);

console.log('Initializing database tables...');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      topic TEXT,
      message TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submitted_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT,
      question TEXT,
      options TEXT, -- JSON string ["A", "B", "C", "D"]
      correctAnswer INTEGER, -- Index 0-3
      explanation TEXT,
      status TEXT DEFAULT 'pending', -- pending, approved, rejected
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Tables created successfully.');
} catch (err) {
  console.error('Error creating tables:', err);
}
