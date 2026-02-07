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
    userId TEXT PRIMARY KEY,   -- Login ID (alphabetic only) - PRIMARY KEY
    nickname TEXT,             -- Display name (alphanumeric)
    role TEXT,
    status TEXT DEFAULT 'active', -- active, suspended
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,               -- Changed to TEXT to match users.userId
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    score INTEGER,
    totalQuestions INTEGER,
    category TEXT,
    wrongQuestionIds TEXT, -- Stored as JSON string
    userAnswers TEXT,      -- Stored as JSON string
    FOREIGN KEY(userId) REFERENCES users(userId)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    userId TEXT,               -- Changed to TEXT to match users.userId
    category TEXT,
    currentQuestionIndex INTEGER,
    answers TEXT,          -- Stored as JSON string
    lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(userId, category),
    FOREIGN KEY(userId) REFERENCES users(userId)
  );

  -- Advanced Analysis Views for A5:SQL Mk-2
  DROP VIEW IF EXISTS view_category_mastery;
  CREATE VIEW view_category_mastery AS
  SELECT 
    u.userId,
    u.nickname,
    a.category,
    COUNT(a.id) as total_attempts,
    SUM(a.score) as total_correct,
    SUM(a.totalQuestions) as total_questions,
    ROUND(CAST(SUM(a.score) AS FLOAT) / SUM(a.totalQuestions) * 100, 2) as accuracy_percentage
  FROM users u
  JOIN attempts a ON u.userId = a.userId
  GROUP BY u.userId, u.nickname, a.category;

  DROP VIEW IF EXISTS view_recent_activity;
  CREATE VIEW view_recent_activity AS
  SELECT 
    u.userId,
    u.nickname,
    a.date,
    a.category,
    a.score || ' / ' || a.totalQuestions as result,
    ROUND(CAST(a.score AS FLOAT) / a.totalQuestions * 100, 2) as accuracy
  FROM users u
  JOIN attempts a ON u.userId = a.userId
  ORDER BY a.date DESC;

  -- New Tables for User Submissions
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,               -- Changed to TEXT to match users.userId
    name TEXT,
    email TEXT,
    topic TEXT,
    message TEXT,
    reply TEXT,
    repliedAt DATETIME,
    status TEXT DEFAULT 'unread',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,               -- Changed to TEXT to match users.userId (NULL for global)
    title TEXT,
    content TEXT,
    type TEXT DEFAULT 'info',
    isRead INTEGER DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT,
    status TEXT DEFAULT 'pending', -- pending, completed
    priority TEXT DEFAULT 'medium', -- low, medium, high
    category TEXT DEFAULT 'general',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    question TEXT,
    options TEXT, -- JSON string
    correctAnswer INTEGER,
    explanation TEXT,
    translations TEXT, -- JSON string
    source TEXT DEFAULT 'system',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS public_chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      message TEXT,
      replyTo INTEGER, 
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES users(userId)
  );
`);

// Robust Column Check / Migration
const migrateTable = (tableName, columns) => {
    const existingColumns = db.prepare(`PRAGMA table_info(${tableName})`).all().map(c => c.name);
    columns.forEach(col => {
        if (!existingColumns.includes(col.name)) {
            console.log(`[Neural Migrator] Adding column ${col.name} to ${tableName}`);
            try {
                db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}`);
            } catch (e) {
                console.error(`[Neural Migrator] Failed to add column ${col.name}:`, e.message);
            }
        }
    });
};


migrateTable('messages', [
    { name: 'userId', type: 'TEXT' },
    { name: 'reply', type: 'TEXT' },
    { name: 'repliedAt', type: 'DATETIME' },
    { name: 'status', type: 'TEXT DEFAULT \'unread\'' }
]);

migrateTable('public_chat', [
    { name: 'replyTo', type: 'INTEGER' } // ID of the message being replied to (optional)
]);

migrateTable('users', [
    { name: 'status', type: 'TEXT DEFAULT \'active\'' },
    { name: 'nickname', type: 'TEXT' }
]);

migrateTable('questions', [
    { name: 'translations', type: 'TEXT' },
    { name: 'source', type: 'TEXT DEFAULT \'system\'' }
]);

// Helper for Paginated / Filtered queries
const getPaginatedData = (tableName, req, searchColumns = []) => {
  const { page = 1, limit = 20, search = '', sortBy = 'id', order = 'DESC', ...filters } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClause = '';
  let params = [];
  const filterConditions = [];

  if (search && searchColumns.length > 0) {
      filterConditions.push('(' + searchColumns.map(col => `LOWER(${col}) LIKE LOWER(?)`).join(' OR ') + ')');
      searchColumns.forEach(() => params.push(`%${search}%`));
  }

  // Handle generalized filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value && ['role', 'status', 'category', 'type', 'priority', 'topic', 'userId'].includes(key)) {
        filterConditions.push(`${key} = ?`);
        params.push(value);
    }
  });

  // Special case for submissions if not filtered by status
  if (tableName === 'submitted_questions' && !filters.status) {
      filterConditions.push('status = ?');
      params.push('pending');
  }

  if (filterConditions.length > 0) {
      whereClause = 'WHERE ' + filterConditions.join(' AND ');
  }

  const countQuery = db.prepare(`SELECT count(*) as total FROM ${tableName} ${whereClause}`);
  const total = countQuery.get(...params).total;
  
  const validSortColumns = ['id', 'category', 'createdAt', 'joinedAt', 'date', 'name', 'username', 'topic', 'status', 'role', 'type', 'title', 'question'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'id';
  const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const data = db.prepare(`
      SELECT * FROM ${tableName} 
      ${whereClause} 
      ORDER BY ${safeSortBy} ${safeOrder} 
      LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  return { data, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } };
};

app.get('/api/admin/stats', (req, res) => {
    try {
        const unreadMessages = db.prepare('SELECT count(*) as count FROM messages WHERE status = ?').get('unread').count;
        const pendingSubmissions = db.prepare('SELECT count(*) as count FROM submitted_questions WHERE status = ?').get('pending').count;
        const totalUsers = db.prepare('SELECT count(*) as count FROM users').get().count;
        const totalQuestions = db.prepare('SELECT count(*) as count FROM questions').get().count;
        res.json({ unreadMessages, pendingSubmissions, totalUsers, totalQuestions });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Routes
app.get('/api/questions', (req, res) => {
  try {
    const { page, limit, search, category } = req.query;
    // Use pagination if any pagination params are provided (even if empty string)
    const usePagination = page !== undefined || limit !== undefined || search !== undefined || category !== undefined;
    
    if (!usePagination) {
        // Legacy fallback - return all questions
        const questions = db.prepare('SELECT * FROM questions').all().map(q => ({
            ...q,
            options: JSON.parse(q.options),
            translations: q.translations ? JSON.parse(q.translations) : undefined
        }));
        return res.json(questions);
    }

    const { data, pagination } = getPaginatedData('questions', req, ['question', 'category', 'explanation']);
    const formatted = data.map(q => ({
        ...q,
        options: JSON.parse(q.options),
        translations: q.translations ? JSON.parse(q.translations) : undefined
    }));
    res.json({ data: formatted, pagination });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/questions', (req, res) => {
   const { category, question, options, correctAnswer, explanation, translations, source, id } = req.body;
   try {
     const stmt = db.prepare(`
       INSERT INTO questions (id, category, question, options, correctAnswer, explanation, translations, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     `);
     const generateId = () => Math.floor(Math.random() * 100000) + 20000; // Random ID for new questions if not provided
     const finalId = id || generateId();
     
     stmt.run(finalId, category, question, JSON.stringify(options), correctAnswer, explanation, JSON.stringify(translations || {}), source || 'admin');
     res.json({ success: true, id: finalId });
   } catch (err) {
     res.status(500).json({ error: err.message });
   }
});

app.put('/api/admin/questions/:id', (req, res) => {
    const { category, question, options, correctAnswer, explanation, translations } = req.body;
    try {
        db.prepare(`
            UPDATE questions 
            SET category = ?, question = ?, options = ?, correctAnswer = ?, explanation = ?, translations = ?
            WHERE id = ?
        `).run(category, question, JSON.stringify(options), correctAnswer, explanation, JSON.stringify(translations || {}), req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/questions/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Public Submission APIs
app.post('/api/contact', (req, res) => {
  const { name, email, topic, message, userId } = req.body;
  try {
    db.prepare(`
      INSERT INTO messages (name, email, topic, message, userId) 
      VALUES (?, ?, ?, ?, ?)
    `).run(name, email, topic, message, userId || null);
    console.log(`[Neural Link] New message received: ${topic} from User ${userId || 'Guest'}`);
    res.json({ success: true });
  } catch (err) {
    console.error("[Neural Link] Contact Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/submit-question', (req, res) => {
  const { category, question, options, correctAnswer, explanation } = req.body;
  try {
    db.prepare(`
      INSERT INTO submitted_questions (category, question, options, correctAnswer, explanation) 
      VALUES (?, ?, ?, ?, ?)
    `).run(category, question, JSON.stringify(options), correctAnswer, explanation);
    console.log(`[Neural Link] New question submitted in ${category}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin APIs for Messages & Submissions
app.get('/api/admin/messages', (req, res) => {
  try {
    const { page, limit, search, sortBy = 'id', order = 'DESC', status, topic } = req.query;
    const usePagination = page !== undefined || limit !== undefined || search !== undefined;
    
    if (!usePagination) {
        // Include nickname from users table
        const messages = db.prepare(`
            SELECT m.*, u.nickname 
            FROM messages m 
            LEFT JOIN users u ON m.userId = u.userId 
            ORDER BY m.createdAt DESC
        `).all();
        return res.json(messages);
    }
    
    // Build WHERE clause for filters
    let whereClause = '';
    let params = [];
    const filterConditions = [];

    if (search) {
        filterConditions.push('(m.name LIKE ? OR m.email LIKE ? OR m.topic LIKE ? OR m.message LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
        filterConditions.push('m.status = ?');
        params.push(status);
    }
    if (topic) {
        filterConditions.push('m.topic = ?');
        params.push(topic);
    }

    if (filterConditions.length > 0) {
        whereClause = 'WHERE ' + filterConditions.join(' AND ');
    }

    // Count total
    const countQuery = `SELECT count(*) as total FROM messages m ${whereClause}`;
    const total = db.prepare(countQuery).get(...params).total;

    // Get paginated data with username
    const validSortColumns = ['id', 'createdAt', 'name', 'topic', 'status'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'id';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    const offset = (parseInt(page || 1) - 1) * parseInt(limit || 10);
    const dataQuery = `
        SELECT m.*, u.nickname 
        FROM messages m 
        LEFT JOIN users u ON m.userId = u.userId 
        ${whereClause} 
        ORDER BY m.${safeSortBy} ${safeOrder} 
        LIMIT ? OFFSET ?
    `;
    const data = db.prepare(dataQuery).all(...params, parseInt(limit || 10), offset);

    res.json({ 
        data, 
        pagination: { 
            total, 
            page: parseInt(page || 1), 
            limit: parseInt(limit || 10), 
            pages: Math.ceil(total / parseInt(limit || 10)) 
        } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/messages/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;
  try {
    const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    db.prepare('UPDATE messages SET reply = ?, repliedAt = CURRENT_TIMESTAMP, status = ? WHERE id = ?')
      .run(reply, 'replied', id);

    // Create notification for the user if userId exists
    if (msg.userId) {
        db.prepare(`
            INSERT INTO notifications (userId, title, content, type) 
            VALUES (?, ?, ?, ?)
        `).run(msg.userId, 'お問い合わせへの回答', `「${msg.topic}」についての回答が届きました: ${reply}`, 'info');
    }

    // Send email if email address is present
    if (msg.email) {
        // In a real app, you would use a real SMTP service.
        // For development/demo, we can use Ethereal or just log it.
        // Here we'll try to set up a transporter.
        
        // Dynamic import to handle ESM/CommonJS if needed, or just require if we were in CJS. 
        // options: host, port, secure, auth: { user, pass }
        // For now, let's assume we use a placeholder or log it if no config.
        
        try {
            // NOTE: You need to install nodemailer: npm install nodemailer
            const nodemailer = await import('nodemailer');
            
            // Example: using Ethereal for testing (or a configured SMTP)
            // If you have real credentials, replace them here or use ENV variables.
            // For this environment, we will just log that we WOULD send an email,
            // or create a test account if we want to be fancy.
            
            // Let's create a test account dynamically for demo purposes
            const testAccount = await nodemailer.createTestAccount();

            const transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: testAccount.user, // generated ethereal user
                    pass: testAccount.pass, // generated ethereal password
                },
            });

            const info = await transporter.sendMail({
                from: '"G-Kentei Support" <support@g-kentei-prep.com>', // sender address
                to: msg.email, // list of receivers
                subject: `Re: ${msg.topic}`, // Subject line
                text: `${msg.name}様\n\nお問い合わせありがとうございます。\n以下の通り回答いたします。\n\n---\n${reply}\n---\n\nG-Kentei Prep Support`, // plain text body
                html: `<p>${msg.name}様</p><p>お問い合わせありがとうございます。<br>以下の通り回答いたします。</p><blockquote>${reply}</blockquote><p>G-Kentei Prep Support</p>`, // html body
            });

            console.log("[Neural Mail] Message sent: %s", info.messageId);
            console.log("[Neural Mail] Preview URL: %s", nodemailer.getTestMessageUrl(info));

        } catch (emailError) {
             console.error("[Neural Mail] Failed to send email:", emailError);
             // Don't fail the request just because email failed, but log it.
        }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/submissions', (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const usePagination = page !== undefined || limit !== undefined || search !== undefined;
    
    if (!usePagination) {
        const submissions = db.prepare('SELECT * FROM submitted_questions WHERE status = ? ORDER BY createdAt DESC').all('pending');
        return res.json(submissions);
    }
    const result = getPaginatedData('submitted_questions', req, ['category', 'question']);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/submissions/:id/approve', (req, res) => {
  const { id } = req.params;
  try {
    const submission = db.prepare('SELECT * FROM submitted_questions WHERE id = ?').get(id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    // Insert into questions table
    const stmt = db.prepare(`
      INSERT INTO questions (category, question, options, correctAnswer, explanation, source)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      submission.category, 
      submission.question, 
      submission.options, 
      submission.correctAnswer, 
      submission.explanation, 
      'user_contribution'
    );

    db.prepare('UPDATE submitted_questions SET status = ? WHERE id = ?').run('approved', id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/submissions/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('UPDATE submitted_questions SET status = ? WHERE id = ?').run('rejected', id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/approved-questions', (req, res) => {
  try {
    const questions = db.prepare('SELECT * FROM submitted_questions WHERE status = ?')
                        .all('approved')
                        .map(q => ({
                            id: 10000 + q.id, // Offset ID to avoid conflict with static questions
                            category: q.category,
                            question: q.question,
                            options: JSON.parse(q.options),
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation
                        }));
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Endpoints
app.get('/api/users', (req, res) => {
    try {
        const { page, limit, search } = req.query;
        const usePagination = page !== undefined || limit !== undefined || search !== undefined;
        
        if (!usePagination) {
            const users = db.prepare('SELECT * FROM users').all();
            return res.json(users);
        }
        const result = getPaginatedData('users', req, ['userId', 'nickname', 'role']);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/users/:key', (req, res) => {
  const { key } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE LOWER(userId) = LOWER(?)').get(key);
  res.json(user || null);
});

app.post('/api/users', (req, res) => {
  const { userId, nickname, role } = req.body;
  
  // Validation
  if (!userId || !nickname) {
    return res.status(400).json({ error: 'ユーザーIDとニックネームは必須です' });
  }
  
  // Validate userId (alphabetic only)
  if (!/^[a-zA-Z]+$/.test(userId)) {
    return res.status(400).json({ error: 'ユーザーIDは英字のみ使用できます' });
  }
  
  // Validate nickname (alphanumeric only)
  if (!/^[a-zA-Z0-9]+$/.test(nickname)) {
    return res.status(400).json({ error: 'ニックネームは英数字のみ使用できます' });
  }
  
  try {
    db.prepare('INSERT INTO users (userId, nickname, role) VALUES (?, ?, ?)').run(userId, nickname, role);
    const user = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
    res.json(user);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'このユーザーIDは既に使用されています' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Chat API
app.get('/api/public-chat', (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const messages = db.prepare(`
            SELECT 
                c.*, 
                u.nickname, 
                u.role 
            FROM public_chat c
            LEFT JOIN users u ON c.userId = u.userId
            ORDER BY c.createdAt DESC
            LIMIT ?
        `).all(limit);
        res.json(messages.reverse());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/public-chat', (req, res) => {
    const { userId, message, replyTo } = req.body;
    if (!userId || !message) return res.status(400).json({ error: 'Missing fields' });
    
    try {
        const info = db.prepare('INSERT INTO public_chat (userId, message, replyTo) VALUES (?, ?, ?)').run(userId, message, replyTo || null);
        const newMsg = db.prepare(`
            SELECT 
                c.*, 
                u.nickname, 
                u.role 
            FROM public_chat c
            LEFT JOIN users u ON c.userId = u.userId
            WHERE c.id = ?
        `).get(info.lastInsertRowid);
        res.json(newMsg);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.patch('/api/admin/users/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    db.prepare('UPDATE users SET status = ? WHERE userId = ?').run(status, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', (req, res) => {
  const { userId, page, limit, search, admin } = req.query;
  try {
    let whereClause = '';
    let params = [];
    
    if (admin === 'true') {
        whereClause = '';
    } else {
        whereClause = 'WHERE (userId = ? OR userId IS NULL)';
        params = [userId];
    }

    if (search) {
        whereClause = whereClause ? `${whereClause} AND (title LIKE ? OR content LIKE ?)` : 'WHERE (title LIKE ? OR content LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    const { sortBy = 'id', order = 'DESC' } = req.query;
    const safeSortBy = ['id', 'createdAt', 'title'].includes(sortBy) ? sortBy : 'id';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const usePagination = page !== undefined || limit !== undefined;
    
    if (!usePagination) {
        const query = `SELECT * FROM notifications ${whereClause} ORDER BY ${safeSortBy} ${safeOrder}`;
        const notes = db.prepare(query).all(...params);
        return res.json(notes);
    }
    
    const offset = (parseInt(page || 1) - 1) * parseInt(limit || 10);
    const countQuery = `SELECT count(*) as total FROM notifications ${whereClause}`;
    const total = db.prepare(countQuery).get(...params).total;

    const dataQuery = `SELECT * FROM notifications ${whereClause} ORDER BY ${safeSortBy} ${safeOrder} LIMIT ? OFFSET ?`;
    const data = db.prepare(dataQuery).all(...params, parseInt(limit || 10), offset);

    res.json({ data, pagination: { total, page: parseInt(page || 1), limit: parseInt(limit || 10), pages: Math.ceil(total / parseInt(limit || 10)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin TODO APIs
app.get('/api/admin/todos', (req, res) => {
    try {
        const todos = db.prepare('SELECT * FROM todos ORDER BY status DESC, createdAt DESC').all();
        res.json(todos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/todos', (req, res) => {
    const { task, priority, category } = req.body;
    try {
        const info = db.prepare('INSERT INTO todos (task, priority, category) VALUES (?, ?, ?)').run(task, priority || 'medium', category || 'general');
        const newTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(info.lastInsertRowid);
        res.json(newTodo);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.patch('/api/admin/todos/:id', (req, res) => {
    const { status, task, priority } = req.body;
    try {
        if (status) {
            db.prepare('UPDATE todos SET status = ? WHERE id = ?').run(status, req.params.id);
        } else if (task) {
            db.prepare('UPDATE todos SET task = ?, priority = ? WHERE id = ?').run(task, priority, req.params.id);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/todos/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/notifications', (req, res) => {
  const { userId, title, content, type } = req.body;
  try {
    db.prepare('INSERT INTO notifications (userId, title, content, type) VALUES (?, ?, ?, ?)')
      .run(userId || null, title, content, type || 'info');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/:id/read', (req, res) => {
    try {
        db.prepare('UPDATE notifications SET isRead = 1 WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
      params.push(userId);
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
  db.prepare('DELETE FROM users WHERE userId = ?').run(req.params.id);
  res.json({ success: true });
});

// SPA fallback - serve index.html for all non-API routes
if (process.env.NODE_ENV === 'production') {
  app.get(/(.*)/, (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3012;
app.listen(PORT, () => {
  console.log(`Neural Backend connected to SQLite: http://localhost:${PORT}`);
});
