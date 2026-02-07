import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath as pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../gkentei.db');
console.log(`[Neural Path] Database Sector: ${dbPath}`);
const db = new Database(dbPath);

const app = express();
app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
  const bodySnippet = req.body && Object.keys(req.body).length ? JSON.stringify(req.body).slice(0, 150) : '';
  console.log(`[Neural Link] ${req.method} ${req.url} ${bodySnippet}`);
  next();
});

// Serve static files from the dist directory in production
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '../dist');
  app.use(express.static(distPath));
  console.log(`[Neural Static] Serving frontend from: ${distPath}`);
}

// Initialize Database Schema with all required columns
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    role TEXT,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    score INTEGER,
    totalQuestions INTEGER,
    category TEXT,
    wrongQuestionIds TEXT, -- Stored as JSON string
    userAnswers TEXT,      -- Stored as JSON string
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    userId INTEGER,
    category TEXT,
    currentQuestionIndex INTEGER,
    answers TEXT,          -- Stored as JSON string
    lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(userId, category),
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  -- Advanced Analysis Views for A5:SQL Mk-2
  DROP VIEW IF EXISTS view_category_mastery;
  CREATE VIEW view_category_mastery AS
  SELECT 
    u.username,
    a.category,
    COUNT(a.id) as total_attempts,
    SUM(a.score) as total_correct,
    SUM(a.totalQuestions) as total_questions,
    ROUND(CAST(SUM(a.score) AS FLOAT) / SUM(a.totalQuestions) * 100, 2) as accuracy_percentage
  FROM users u
  JOIN attempts a ON u.id = a.userId
  GROUP BY u.username, a.category;

  DROP VIEW IF EXISTS view_recent_activity;
  CREATE VIEW view_recent_activity AS
  SELECT 
    u.username,
    a.date,
    a.category,
    a.score || ' / ' || a.totalQuestions as result,
    ROUND(CAST(a.score AS FLOAT) / a.totalQuestions * 100, 2) as accuracy
  FROM users u
  JOIN attempts a ON u.id = a.userId
  ORDER BY a.date DESC;
`);

// API Endpoints
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

app.get('/api/users/:key', (req, res) => {
  const { key } = req.params;
  let user;
  if (/^\d+$/.test(key)) {
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(key);
  } else {
    user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(key);
  }
  res.json(user || null);
});

app.post('/api/users', (req, res) => {
  const { username, role } = req.body;
  try {
    const info = db.prepare('INSERT INTO users (username, role) VALUES (?, ?)').run(username, role);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    res.json(user);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'User already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.get('/api/attempts', (req, res) => {
  try {
    const { userId, sort } = req.query;
    let sql = 'SELECT * FROM attempts';
    let params = [];
    
    if (userId) {
      sql += ' WHERE userId = ?';
      // Explicitly cast to integer to be safe with SQLite
      params.push(parseInt(userId.toString(), 10));
    }
    
    if (sort === 'date') sql += ' ORDER BY date DESC';
    
    const attempts = db.prepare(sql).all(...params);
    attempts.forEach(a => {
      try {
        a.wrongQuestionIds = typeof a.wrongQuestionIds === 'string' ? JSON.parse(a.wrongQuestionIds || '[]') : a.wrongQuestionIds;
        a.userAnswers = typeof a.userAnswers === 'string' ? JSON.parse(a.userAnswers || '{}') : a.userAnswers;
      } catch (e) {
        console.error(`[Neural DB] JSON Parse error for attempt ${a.id}:`, e);
      }
    });
    console.log(`[Neural DB] Found ${attempts.length} attempts for user ${userId}`);
    res.json(attempts);
  } catch (err) {
    console.error('[Neural DB] Error fetching attempts:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attempts', (req, res) => {
  const { userId, date, score, category, totalQuestions, wrongQuestionIds, userAnswers } = req.body;
  const info = db.prepare(`
    INSERT INTO attempts (userId, date, score, category, totalQuestions, wrongQuestionIds, userAnswers) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, date, score, category, totalQuestions, JSON.stringify(wrongQuestionIds), JSON.stringify(userAnswers));
  res.json({ id: info.lastInsertRowid });
});

app.delete('/api/attempts', (req, res) => {
  const { userId } = req.query;
  db.prepare('DELETE FROM attempts WHERE userId = ?').run(userId);
  res.json({ success: true });
});

app.get('/api/sessions', (req, res) => {
  const { userId, category } = req.query;
  if (category) {
    const session = db.prepare('SELECT * FROM sessions WHERE userId = ? AND category = ?').get(userId, category);
    if (session) {
        session.answers = JSON.parse(session.answers || '[]');
    }
    res.json(session || null);
  } else {
    const sessions = db.prepare('SELECT * FROM sessions WHERE userId = ?').all(userId);
    sessions.forEach(s => s.answers = JSON.parse(s.answers || '[]'));
    res.json(sessions);
  }
});

app.post('/api/sessions', (req, res) => {
  const { userId, category, currentQuestionIndex, answers } = req.body;
  db.prepare(`
    INSERT OR REPLACE INTO sessions (userId, category, currentQuestionIndex, answers, lastUpdated) 
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(userId, category, currentQuestionIndex, JSON.stringify(answers));
  res.json({ success: true });
});

app.patch('/api/sessions/:id', (req, res) => {
  const [userId, category] = req.params.id.split(',');
  const { currentQuestionIndex, answers } = req.body;
  
  if (answers) {
    db.prepare('UPDATE sessions SET currentQuestionIndex = ?, answers = ?, lastUpdated = CURRENT_TIMESTAMP WHERE userId = ? AND category = ?')
      .run(currentQuestionIndex, JSON.stringify(answers), userId, category);
  } else {
    db.prepare('UPDATE sessions SET currentQuestionIndex = ?, lastUpdated = CURRENT_TIMESTAMP WHERE userId = ? AND category = ?')
      .run(currentQuestionIndex, userId, category);
  }
  res.json({ success: true });
});

app.delete('/api/sessions/:id', (req, res) => {
  const [userId, category] = req.params.id.split(',');
  db.prepare('DELETE FROM sessions WHERE userId = ? AND category = ?').run(userId, category);
  res.json({ success: true });
});

app.delete('/api/sessions', (req, res) => {
  const { userId } = req.query;
  db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
  res.json({ success: true });
});

app.get('/api/diagnostics', (req, res) => {
  const users = db.prepare('SELECT count(*) as count FROM users').get();
  const attempts = db.prepare('SELECT count(*) as count FROM attempts').get();
  const sessions = db.prepare('SELECT count(*) as count FROM sessions').get();
  const recent = db.prepare('SELECT * FROM attempts ORDER BY date DESC LIMIT 5').all();
  res.json({
    counts: { users: users.count, attempts: attempts.count, sessions: sessions.count },
    recentAttempts: recent,
    dbPath
  });
});

app.delete('/api/users/:id', (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// SPA fallback - serve index.html for all non-API routes
if (process.env.NODE_ENV === 'production') {
  app.get(/(.*)/, (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3011;
app.listen(PORT, () => {
  console.log(`Neural Backend connected to SQLite: http://localhost:${PORT}`);
});
