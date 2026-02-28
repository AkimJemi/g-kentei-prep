import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { cache } from './cache.js';
import winston from 'winston';

const __dirname = dirname(fileURLToPath(import.meta.url));
import crypto from 'crypto';

/* Old handler references removed */

// Postgres Connection Pool
// In Render, the environment variable DATABASE_URL will be provided.
// Internal: postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a/g_kentei_prep_app_db
const connectionString = process.env.DATABASE_URL || 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db';
console.log(`[Neural Link] Connecting to Postgres Sector (Oregon Cluster)...`);

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});



const app = express();
app.use(cors());
app.use(express.json());

// Ensure logs directory exists
import fsSync from 'fs';
const logsDir = join(__dirname, 'logs');
if (!fsSync.existsSync(logsDir)) {
  fsSync.mkdirSync(logsDir);
}

// Initialize Winston Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: join(logsDir, 'combined.log') }),
  ],
});

// If we're not in production then log to the `console` as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// --- Backend Global Error Handler ---
const logBackendError = async (type, message, stack, reqInfo = '') => {
  const errorId = `SYS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // 1. Log to Winston
  logger.error(`[${type}] ${errorId} ${message}`, { stack, reqInfo });

  // 2. Save to DB
  try {
    await pool.query(`
      INSERT INTO g_kentei_error_logs (errorId, screenId, errorMessage, errorStack)
      VALUES ($1, $2, $3, $4)
    `, [errorId, 'BACKEND_API', `[${type}] ${message}\n${reqInfo}`, stack || '']);
  } catch (dbErr) {
    logger.error('[Fatal] Failed to write error to DB', { error: dbErr.message });
  }
};

process.on('uncaughtException', (err) => {
  logBackendError('UncaughtException', err.message, err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
  logBackendError('UnhandledRejection', reason?.message || String(reason), reason?.stack);
});

// Intercept 500 Responses
app.use((req, res, next) => {
  const originalJson = res.json;
  const originalStatus = res.status;

  res.status = function (code) {
    res.__statusCode = code;
    return originalStatus.apply(this, arguments);
  };

  res.json = function (body) {
    if ((res.__statusCode >= 500 || res.statusCode >= 500) && body && body.error) {
      logBackendError(
        'API_500',
        body.error,
        '',
        `Route: ${req.method} ${req.url}`
      );
    }
    return originalJson.apply(this, arguments);
  };
  next();
});
// ------------------------------------

// Initialize Database Schema
const initDB = async () => {
  let client;
  try {
    console.log('[Neural DB] Attempting to acquire client from pool...');
    client = await pool.connect();
    console.log('[Neural DB] Client acquired. Applying Schema Manifest...');
    const tables = [
      {
        name: 'g_kentei_users',
        query: `CREATE TABLE IF NOT EXISTS g_kentei_users (
          userId TEXT PRIMARY KEY,
          nickname TEXT,
          role TEXT,
          status TEXT DEFAULT 'active',
          joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        name: 'g_kentei_attempts',
        query: `CREATE TABLE IF NOT EXISTS g_kentei_attempts (
          id SERIAL PRIMARY KEY,
          userId TEXT REFERENCES g_kentei_users(userId),
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          score INTEGER,
          totalQuestions INTEGER,
          category TEXT,
          wrongQuestionIds TEXT,
          userAnswers TEXT
        );`
      },
      {
        name: 'g_kentei_sessions',
        query: `CREATE TABLE IF NOT EXISTS g_kentei_sessions (
          userId TEXT REFERENCES g_kentei_users(userId),
          category TEXT,
          currentQuestionIndex INTEGER,
          answers TEXT,
          lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(userId, category)
        );`
      },
      {
        name: 'g_kentei_messages',
        query: `CREATE TABLE IF NOT EXISTS g_kentei_messages (
          id SERIAL PRIMARY KEY,
          userId TEXT REFERENCES g_kentei_users(userId),
          name TEXT,
          email TEXT,
          topic TEXT,
          message TEXT,
          reply TEXT,
          repliedAt TIMESTAMP,
          status TEXT DEFAULT 'unread',
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        name: 'g_kentei_notifications',
        query: `CREATE TABLE IF NOT EXISTS g_kentei_notifications (
          id SERIAL PRIMARY KEY,
          userId TEXT REFERENCES g_kentei_users(userId),
          title TEXT,
          content TEXT,
          type TEXT DEFAULT 'info',
          isRead INTEGER DEFAULT 0,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        name: 'g_kentei_submitted_questions',
        query: `CREATE TABLE IF NOT EXISTS g_kentei_submitted_questions (
          id SERIAL PRIMARY KEY,
          category TEXT,
          question TEXT,
          options TEXT,
          correctAnswer INTEGER,
          explanation TEXT,
          status TEXT DEFAULT 'pending',
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        name: 'g_kentei_todos',
        query: `CREATE TABLE IF NOT EXISTS g_kentei_todos (
          id SERIAL PRIMARY KEY,
          task TEXT,
          status TEXT DEFAULT 'pending',
          priority TEXT DEFAULT 'medium',
          category TEXT DEFAULT 'general',
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        name: 'g_kentei_questions',
        query: `CREATE TABLE IF NOT EXISTS g_kentei_questions (
          id SERIAL PRIMARY KEY,
          category TEXT,
          question TEXT,
          options TEXT,
          correctAnswer INTEGER,
          explanation TEXT,
          source TEXT DEFAULT 'system',
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          optionExplanations TEXT
        );`
      },
      {
        name: 'g_kentei_public_chat',
        query: `CREATE TABLE IF NOT EXISTS g_kentei_public_chat (
            id SERIAL PRIMARY KEY,
            userId TEXT REFERENCES g_kentei_users(userId),
            message TEXT,
            replyTo INTEGER, 
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        name: 'g_kentei_categories',
        query: `CREATE TABLE IF NOT EXISTS g_kentei_categories (
          id TEXT PRIMARY KEY,
          title TEXT,
          icon TEXT,
          color TEXT,
          bg TEXT,
          description TEXT,
          displayOrder INTEGER DEFAULT 0
        );`
      },
      {
        name: 'subscriptions',
        query: `CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          userId TEXT REFERENCES g_kentei_users(userId),
          projectScope TEXT,
          status TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        name: 'g_kentei_user_notes',
        query: `CREATE TABLE IF NOT EXISTS g_kentei_user_notes (
          id SERIAL PRIMARY KEY,
          userId TEXT REFERENCES g_kentei_users(userId),
          documentId TEXT,
          noteContent TEXT,
          lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(userId, documentId)
        );`
      },
      {
        name: 'g_kentei_error_logs',
        query: `CREATE TABLE IF NOT EXISTS g_kentei_error_logs (
            errorId TEXT PRIMARY KEY,
            status TEXT DEFAULT '未確認',
            screenId TEXT,
            errorMessage TEXT,
            errorStack TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`
      }
    ];

    for (const table of tables) {
      console.log(`[Neural DB] Synchronizing table: ${table.name}`);
      try {
        await client.query(table.query);
      } catch (tableErr) {
        logger.error(`[Neural DB] Failed to sync table ${table.name}:`, { error: tableErr.message });
      }
    }
    // Categories are now seeded directly in Japanese. No need to re-seed.
    console.log('[Neural DB] Category initialization skipped. Expecting Japanese Categories directly from DB.');

    // Seed Admin User if empty
    const userRes = await client.query('SELECT count(*) as count FROM g_kentei_users');
    if (parseInt(userRes.rows[0].count) === 0) {
      console.log('[Neural DB] Seeding Admin Overlord...');
      await client.query(`
            INSERT INTO g_kentei_users (userId, nickname, role)
            VALUES ($1, $2, $3)
        `, ['jemin.kim', 'Akim', 'admin']);
      console.log('[Neural DB] Admin Seeded.');
    }
    console.log('[Neural DB] Schema Manifest Integrated.');
  } catch (err) {
    logger.error('[Neural DB] Schema Integration Failed:', err);
  } finally {
    client.release();
  }
};

initDB()
  .then(() => {
    console.log('[Neural DB] Initialization complete.');
    // Cache Warming
    console.log('[Neural Cache] Warming up memory banks...');

    // 1. Warm Categories
    pool.query('SELECT * FROM g_kentei_categories ORDER BY displayorder ASC')
      .then(res => {
        cache.set('static', 'categories', res.rows);
        console.log(`[Neural Cache] Categories warmed: ${res.rows.length} items`);
        console.log(`[Neural Cache] Category IDs: ${res.rows.map(c => c.id).join(', ')}`);
      })
      .catch(err => console.error('[Neural Cache] Failed to warm categories:', err));

    // 2. Warm Questions (First Page)
    pool.query('SELECT * FROM g_kentei_questions')
      .then(res => {
        const questions = res.rows.map(q => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
          optionExplanations: q.optionexplanations ? (typeof q.optionexplanations === 'string' ? JSON.parse(q.optionexplanations) : q.optionexplanations) : undefined
        }));

        // Warm the "all questions" query
        const cacheKeyAll = `questions:${JSON.stringify({})}`;
        cache.set('query', cacheKeyAll, questions);

        // Warm the "paginated page 1" query
        // Simulate req.query for default params
        // const defaultParams = { page: '1', limit: '20' };
        // We can't easily replicate getPaginatedData logic without calling it, 
        // but for now, warming the raw 'all' list covers the most expensive part if we cache the transformed rows.
        // Actually, getPaginatedData generates SQL. 
        // Let's just warm the specific key for "all questions" which is used by default if no params

        console.log(`[Neural Cache] Questions warmed: ${questions.length} items`);
      })
      .catch(err => console.error('[Neural Cache] Failed to warm questions:', err));
  })
  .catch(err => {
    console.error('[CRITICAL] initDB Failed:', err);
  });

// Robust Column Check / Migration (Postgres version)
const migrateTable = async (tableName, columns) => {
  const client = await pool.connect();
  try {
    const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = $1
        `, [tableName]);

    const existingColumns = res.rows.map(r => r.column_name);

    for (const col of columns) {
      if (!existingColumns.includes(col.name.toLowerCase())) {
        console.log(`[Neural Migrator] Adding column ${col.name} to ${tableName}`);
        await client.query(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}`);
      }
    }
  } catch (e) {
    console.error(`[Neural Migrator] Failed to migrate ${tableName}:`, e.message);
  } finally {
    client.release();
  }
};

// Start migrations
/*
(async () => {
    await migrateTable('g_kentei_messages', [
        { name: 'userId', type: 'TEXT' },
        { name: 'reply', type: 'TEXT' },
        { name: 'repliedAt', type: 'TIMESTAMP' },
        { name: 'status', type: 'TEXT DEFAULT \'unread\'' }
    ]);
    await migrateTable('g_kentei_public_chat', [
        { name: 'replyTo', type: 'INTEGER' }
    ]);
})();
*/

// Helper for Paginated / Filtered queries (Postgres version)
const getPaginatedData = async (tableName, req, searchColumns = []) => {
  const { page = 1, limit = 20, search = '', sortBy = 'id', order = 'DESC', ...filters } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereConditions = [];
  let params = [];
  let paramIndex = 1;

  if (search && searchColumns.length > 0) {
    const searchParts = searchColumns.map(col => `LOWER(${col}) LIKE LOWER($${paramIndex++})`);
    whereConditions.push('(' + searchParts.join(' OR ') + ')');
    searchColumns.forEach(() => params.push(`%${search}%`));
  }

  // Handle generalized filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value && ['role', 'status', 'category', 'type', 'priority', 'topic', 'userId'].includes(key)) {
      whereConditions.push(`${key} = $${paramIndex++}`);
      params.push(value);
    }
  });

  if (tableName === 'submitted_questions' && !filters.status) {
    whereConditions.push(`status = $${paramIndex++}`);
    params.push('pending');
  }

  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

  const countRes = await pool.query(`SELECT count(*) as total FROM ${tableName} ${whereClause}`, params);
  const total = parseInt(countRes.rows[0].total);

  const validSortColumns = ['id', 'userId', 'category', 'createdAt', 'joinedAt', 'date', 'name', 'username', 'topic', 'status', 'role', 'type', 'title', 'question'];
  let safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'id';
  if (tableName === 'g_kentei_users' && safeSortBy === 'id') {
    safeSortBy = 'userId';
  }
  const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const dataRes = await pool.query(`
      SELECT * FROM ${tableName} 
      ${whereClause} 
      ORDER BY ${safeSortBy} ${safeOrder} 
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `, [...params, parseInt(limit), offset]);

  return {
    data: dataRes.rows,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  };
};

// Category APIs
app.get('/api/categories', async (req, res) => {
  try {
    const cached = cache.get('static', 'categories');
    if (cached) return res.json(cached);

    const result = await pool.query('SELECT * FROM g_kentei_categories ORDER BY displayorder ASC');
    cache.set('static', 'categories', result.rows);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/categories', async (req, res) => {
  const { id, title, icon, color, bg, description, displayOrder } = req.body;
  try {
    await pool.query(`
            INSERT INTO g_kentei_categories (id, title, icon, color, bg, description, displayorder)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, title, icon, color, bg, description, displayOrder || 0]);
    cache.invalidate('static', 'categories');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/categories/:id', async (req, res) => {
  const { title, icon, color, bg, description, displayOrder } = req.body;
  try {
    await pool.query(`
            UPDATE g_kentei_categories 
            SET title = $1, icon = $2, color = $3, bg = $4, description = $5, displayorder = $6
            WHERE id = $7
        `, [title, icon, color, bg, description, displayOrder, req.params.id]);
    cache.invalidate('static', 'categories');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM g_kentei_categories WHERE id = $1', [req.params.id]);
    cache.invalidate('static', 'categories');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/admin/stats', async (req, res) => {
  try {
    const unreadMessagesResult = await pool.query('SELECT count(*) as count FROM g_kentei_messages WHERE status = $1', ['unread']);
    const pendingSubmissionsResult = await pool.query('SELECT count(*) as count FROM g_kentei_submitted_questions WHERE status = $1', ['pending']);
    const totalUsersResult = await pool.query('SELECT count(*) as count FROM g_kentei_users');
    const totalQuestionsResult = await pool.query('SELECT count(*) as count FROM g_kentei_questions');

    res.json({
      unreadMessages: parseInt(unreadMessagesResult.rows[0].count),
      pendingSubmissions: parseInt(pendingSubmissionsResult.rows[0].count),
      totalUsers: parseInt(totalUsersResult.rows[0].count),
      totalQuestions: parseInt(totalQuestionsResult.rows[0].count)
    });
  } catch (e) {
    console.error('[Admin Stats Error]:', e);
    res.status(500).json({ error: e.message });
  }
});

// Routes
app.get('/api/questions', async (req, res) => {
  try {
    const { page, limit, search, category, userId } = req.query;

    // Feature Gating Logic
    if (userId) {
      const isAdminRes = await pool.query('SELECT role FROM g_kentei_users WHERE userId = $1', [userId]);
      const isAdmin = isAdminRes.rows[0]?.role === 'admin';

      if (!isAdmin) {
        // Check Subscription
        const subRes = await pool.query('SELECT status FROM subscriptions WHERE userId = $1 AND (projectScope = $2 OR projectScope = $3) AND status = $4', [userId, 'g-kentei', 'all', 'active']);
        const hasActiveSub = subRes.rows.length > 0;

        if (!hasActiveSub) {
          // Count attempts today
          const attemptsRes = await pool.query(`
                    SELECT count(*) as count 
                    FROM g_kentei_attempts 
                    WHERE userId = $1 AND date >= CURRENT_DATE
                `, [userId]);
          const dailyAttempts = parseInt(attemptsRes.rows[0].count);

          if (dailyAttempts >= 3) {
            return res.status(403).json({
              error: 'Daily limit reached',
              limitReached: true,
              message: '1日の無料学習制限（3回）に達しました。プレミアムプランで無制限に学習しましょう！'
            });
          }
        }
      }
    }

    // Check Cache for non-gated requests
    const cacheKey = `questions:${JSON.stringify(req.query)}`;
    if (!userId) { // Only cache public/non-user specific queries to avoid leaking gated content logic or user state
      const cached = cache.get('query', cacheKey);
      if (cached) return res.json(cached);
    }

    const usePagination = page !== undefined || limit !== undefined || search !== undefined || category !== undefined;



    if (!usePagination) {
      const result = await pool.query('SELECT * FROM g_kentei_questions ORDER BY id ASC');
      const questions = result.rows.map(q => ({
        ...q,
        correctAnswer: q.correctanswer,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        optionExplanations: q.optionexplanations ? (typeof q.optionexplanations === 'string' ? JSON.parse(q.optionexplanations) : q.optionexplanations) : undefined
      }));
      if (!userId) cache.set('query', cacheKey, questions);
      return res.json(questions);
    }

    const { data, pagination } = await getPaginatedData('g_kentei_questions', req, ['category', 'question', 'explanation']);

    const formatted = data.map(q => ({
      ...q,
      correctAnswer: q.correctanswer,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      optionExplanations: q.optionexplanations ? (typeof q.optionexplanations === 'string' ? JSON.parse(q.optionexplanations) : q.optionexplanations) : undefined
    }));

    const response = { data: formatted, pagination };
    if (!userId) cache.set('query', cacheKey, response);
    res.json(response);
  } catch (err) {
    console.error('[API Error] GET /api/questions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/questions', async (req, res) => {
  const { category, question, options, correctAnswer, explanation, source } = req.body;
  try {
    const result = await pool.query(`
       INSERT INTO g_kentei_questions (category, question, options, correctAnswer, explanation, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id
     `, [category, question, JSON.stringify(options), correctAnswer, explanation, source || 'admin']);
    cache.invalidate('query');
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/questions/:id', async (req, res) => {
  const { category, question, options, correctAnswer, explanation } = req.body;
  try {
    await pool.query(`
            UPDATE g_kentei_questions 
            SET category = $1, question = $2, options = $3, correctAnswer = $4, explanation = $5
            WHERE id = $6
        `, [category, question, JSON.stringify(options), correctAnswer, explanation, req.params.id]);
    cache.invalidate('query');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/questions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM g_kentei_questions WHERE id = $1', [req.params.id]);
    cache.invalidate('query');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, topic, message, userId } = req.body;
  try {
    await pool.query(`
      INSERT INTO g_kentei_messages (name, email, topic, message, userId) 
      VALUES ($1, $2, $3, $4, $5)
    `, [name, email, topic, message, userId || null]);
    console.log(`[Neural Link] New message received: ${topic} from User ${userId || 'Guest'}`);
    res.json({ success: true });
  } catch (err) {
    console.error("[Neural Link] Contact Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/submit-question', async (req, res) => {
  const { category, question, options, correctAnswer, explanation } = req.body;
  try {
    await pool.query(`
      INSERT INTO g_kentei_submitted_questions (category, question, options, correctAnswer, explanation) 
      VALUES ($1, $2, $3, $4, $5)
    `, [category, question, JSON.stringify(options), correctAnswer, explanation]);
    console.log(`[Neural Link] New question submitted in ${category}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin APIs for Messages & Submissions
app.get('/api/admin/messages', async (req, res) => {
  try {
    const { page, limit, search, sortBy = 'id', order = 'DESC', status, topic } = req.query;
    const usePagination = page !== undefined || limit !== undefined || search !== undefined;

    if (!usePagination) {
      const result = await pool.query(`
            SELECT m.*, u.nickname 
            FROM g_kentei_messages m 
            LEFT JOIN g_kentei_users u ON m.userId = u.userId 
            ORDER BY m.createdAt DESC
        `);
      return res.json(result.rows);
    }

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(m.name LIKE $${paramIndex} OR m.email LIKE $${paramIndex} OR m.topic LIKE $${paramIndex} OR m.message LIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (status) {
      whereConditions.push(`m.status = $${paramIndex++}`);
      params.push(status);
    }
    if (topic) {
      whereConditions.push(`m.topic = $${paramIndex++}`);
      params.push(topic);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    const countRes = await pool.query(`SELECT count(*) as total FROM g_kentei_messages m ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].total);

    const validSortColumns = ['id', 'createdAt', 'name', 'topic', 'status'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'id';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (parseInt(page || 1) - 1) * parseInt(limit || 10);
    const dataRes = await pool.query(`
        SELECT m.*, u.nickname 
        FROM g_kentei_messages m 
        LEFT JOIN g_kentei_users u ON m.userId = u.userId 
        ${whereClause} 
        ORDER BY m.${safeSortBy} ${safeOrder} 
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, parseInt(limit || 10), offset]);

    res.json({
      data: dataRes.rows,
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
    const msgRes = await pool.query('SELECT * FROM g_kentei_messages WHERE id = $1', [id]);
    const msg = msgRes.rows[0];
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    await pool.query('UPDATE g_kentei_messages SET reply = $1, repliedAt = CURRENT_TIMESTAMP, status = $2 WHERE id = $3', [reply, 'replied', id]);

    if (msg.userId) {
      await pool.query(`
            INSERT INTO g_kentei_notifications (userId, title, content, type) 
            VALUES ($1, $2, $3, $4)
        `, [msg.userId, 'お問い合わせへの回答', `「${msg.topic}」についての回答が届きました: ${reply}`, 'info']);
    }

    if (msg.email) {
      try {
        const nodemailer = await import('nodemailer');
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });

        const info = await transporter.sendMail({
          from: '"G-Kentei Support" <support@g-kentei-prep.com>',
          to: msg.email,
          subject: `Re: ${msg.topic}`,
          text: `${msg.name}様\n\nお問い合わせありがとうございます。\n以下の通り回答いたします。\n\n---\n${reply}\n---\n\nG-Kentei Prep Support`,
          html: `<p>${msg.name}様</p><p>お問い合わせありがとうございます。<br>以下の通り回答いたします。</p><blockquote>${reply}</blockquote><p>G-Kentei Prep Support</p>`,
        });
        console.log("[Neural Mail] Message sent: %s", info.messageId);
      } catch (emailError) {
        console.error("[Neural Mail] Failed to send email:", emailError);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/submissions', async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const usePagination = page !== undefined || limit !== undefined || search !== undefined;

    if (!usePagination) {
      const result = await pool.query('SELECT * FROM g_kentei_submitted_questions WHERE status = $1 ORDER BY createdAt DESC', ['pending']);
      return res.json(result.rows);
    }
    const result = await getPaginatedData('g_kentei_submitted_questions', req, ['category', 'question']);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/submissions/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const subRes = await pool.query('SELECT * FROM g_kentei_submitted_questions WHERE id = $1', [id]);
    const submission = subRes.rows[0];
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    await pool.query(`
      INSERT INTO g_kentei_questions (category, question, options, correctAnswer, explanation, source)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [submission.category, submission.question, submission.options, submission.correctAnswer, submission.explanation, 'user_contribution']);

    await pool.query('UPDATE g_kentei_submitted_questions SET status = $1 WHERE id = $2', ['approved', id]);
    cache.invalidate('query'); // Invalidate questions because a new one was added
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/submissions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE g_kentei_submitted_questions SET status = $1 WHERE id = $2', ['rejected', id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/approved-questions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM g_kentei_submitted_questions WHERE status = $1', ['approved']);
    const questions = result.rows.map(q => ({
      id: 10000 + q.id,
      category: q.category,
      question: q.question,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }));
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const formatUser = (user) => {
  if (!user) return null;
  return {
    userId: user.userid,
    nickname: user.nickname,
    role: user.role,
    status: user.status,
    joinedAt: user.joinedat
  };
};

app.get('/api/users', async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const cacheKey = `users:${JSON.stringify(req.query)}`;
    const cached = cache.get('user', cacheKey);
    if (cached) return res.json(cached);

    const usePagination = page !== undefined || limit !== undefined || search !== undefined;

    if (!usePagination) {
      const result = await pool.query('SELECT * FROM g_kentei_users');
      const response = result.rows.map(formatUser);
      cache.set('user', cacheKey, response);
      return res.json(response);
    }
    const { data, pagination } = await getPaginatedData('g_kentei_users', req, ['userId', 'nickname', 'role']);
    const response = { data: data.map(formatUser), pagination };
    cache.set('user', cacheKey, response);
    res.json(response);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const result = await pool.query('SELECT * FROM g_kentei_users WHERE LOWER(userId) = LOWER($1)', [key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(formatUser(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { userId, nickname, role } = req.body;
  if (!userId || !nickname) return res.status(400).json({ error: 'ユーザーIDとニックネームは必須です' });
  if (!/^[a-zA-Z0-9._-]+$/.test(userId)) return res.status(400).json({ error: 'ユーザーIDは英数字、ドット(.)、アンダースコア(_)、ハイフン(-)のみ使用できます' });

  try {
    await pool.query('INSERT INTO g_kentei_users (userId, nickname, role) VALUES ($1, $2, $3)', [userId, nickname, role]);
    const user = await pool.query('SELECT * FROM g_kentei_users WHERE userId = $1', [userId]);
    cache.invalidate('user');
    res.json(formatUser(user.rows[0]));
  } catch (err) {
    if (err.message.includes('unique') || err.code === '23505') {
      res.status(400).json({ error: 'このユーザーIDは既に使用されています' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.get('/api/rankings', async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT 
                a.userId, 
                MAX(u.nickname) as nickname,
                MAX(u.role) as role,
                SUM(a.score) as totalScore,
                COUNT(a.id) as missionCount
            FROM g_kentei_attempts a
            LEFT JOIN g_kentei_users u ON a.userId = u.userId
            GROUP BY a.userId
            ORDER BY totalScore DESC
            LIMIT 10
        `);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Chat API
app.get('/api/public-chat', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await pool.query(`
            SELECT 
                c.*, 
                u.nickname, 
                u.role 
            FROM g_kentei_public_chat c
            LEFT JOIN g_kentei_users u ON c.userId = u.userId
            ORDER BY c.createdAt DESC
            LIMIT $1
        `, [limit]);
    res.json(result.rows.reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/public-chat', async (req, res) => {
  const { userId, message, replyTo } = req.body;
  if (!userId || !message) return res.status(400).json({ error: 'Missing fields' });

  try {
    const insertRes = await pool.query('INSERT INTO g_kentei_public_chat (userId, message, replyTo) VALUES ($1, $2, $3) RETURNING id', [userId, message, replyTo || null]);
    const newMsg = await pool.query(`
            SELECT 
                c.*, 
                u.nickname, 
                u.role 
            FROM g_kentei_public_chat c
            LEFT JOIN g_kentei_users u ON c.userId = u.userId
            WHERE c.id = $1
        `, [insertRes.rows[0].id]);
    res.json(newMsg.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/public-chat/:id', async (req, res) => {
  const { userId } = req.body;
  const { id } = req.params;

  try {
    const userRes = await pool.query('SELECT role FROM g_kentei_users WHERE userId = $1', [userId]);
    const user = userRes.rows[0];
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    const deleteRes = await pool.query('DELETE FROM g_kentei_public_chat WHERE id = $1', [id]);
    if (deleteRes.rowCount > 0) {
      console.log(`[Neural Chat] Message ${id} deleted by Admin ${userId}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Message not found' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/admin/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE g_kentei_users SET status = $1 WHERE userId = $2', [status, id]);
    cache.invalidate('user');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', async (req, res) => {
  const { userId, page, limit, search, admin } = req.query;
  try {
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (admin === 'true') {
      // No restriction
    } else {
      whereConditions.push(`(userId = $${paramIndex++} OR userId IS NULL)`);
      params.push(userId);
    }

    if (search) {
      whereConditions.push(`(title LIKE $${paramIndex} OR content LIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    const { sortBy = 'id', order = 'DESC' } = req.query;
    const safeSortBy = ['id', 'createdAt', 'title'].includes(sortBy) ? sortBy : 'id';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const usePagination = page !== undefined || limit !== undefined;

    if (!usePagination) {
      const query = `SELECT * FROM g_kentei_notifications ${whereClause} ORDER BY ${safeSortBy} ${safeOrder}`;
      const result = await pool.query(query, params);
      return res.json(result.rows);
    }

    const offset = (parseInt(page || 1) - 1) * parseInt(limit || 10);
    const countRes = await pool.query(`SELECT count(*) as total FROM g_kentei_notifications ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].total);

    const dataRes = await pool.query(`SELECT * FROM g_kentei_notifications ${whereClause} ORDER BY ${safeSortBy} ${safeOrder} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`, [...params, parseInt(limit || 10), offset]);

    res.json({ data: dataRes.rows, pagination: { total, page: parseInt(page || 1), limit: parseInt(limit || 10), pages: Math.ceil(total / parseInt(limit || 10)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM g_kentei_todos ORDER BY status DESC, createdAt DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/todos', async (req, res) => {
  const { task, priority, category } = req.body;
  try {
    const result = await pool.query('INSERT INTO g_kentei_todos (task, priority, category) VALUES ($1, $2, $3) RETURNING *', [task, priority || 'medium', category || 'general']);
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/admin/todos/:id', async (req, res) => {
  const { status, task, priority } = req.body;
  try {
    if (status) {
      await pool.query('UPDATE g_kentei_todos SET status = $1 WHERE id = $2', [status, req.params.id]);
    } else if (task) {
      await pool.query('UPDATE g_kentei_todos SET task = $1, priority = $2 WHERE id = $3', [task, priority, req.params.id]);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/todos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM g_kentei_todos WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/notifications', async (req, res) => {
  const { userId, title, content, type } = req.body;
  try {
    await pool.query('INSERT INTO g_kentei_notifications (userId, title, content, type) VALUES ($1, $2, $3, $4)', [userId || null, title, content, type || 'info']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE g_kentei_notifications SET isRead = 1 WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attempts', async (req, res) => {
  try {
    const { userId, sort } = req.query;
    let sql = 'SELECT * FROM g_kentei_attempts';
    let params = [];
    let paramIndex = 1;

    if (userId) {
      sql += ` WHERE userId = $${paramIndex++}`;
      params.push(userId);
    }

    if (sort === 'date') sql += ' ORDER BY date DESC';

    const result = await pool.query(sql, params);
    const attempts = result.rows.map(a => {
      try {
        a.wrongQuestionIds = typeof a.wrongQuestionIds === 'string' ? JSON.parse(a.wrongQuestionIds || '[]') : a.wrongQuestionIds;
        a.userAnswers = typeof a.userAnswers === 'string' ? JSON.parse(a.userAnswers || '{}') : a.userAnswers;
      } catch (e) {
        console.error(`[Neural DB] JSON Parse error for attempt ${a.id}:`, e);
      }
      return a;
    });
    res.json(attempts);
  } catch (err) {
    console.error('[Neural DB] Error fetching attempts:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attempts', async (req, res) => {
  const { userId, date, score, category, totalQuestions, wrongQuestionIds, userAnswers } = req.body;
  try {
    const result = await pool.query(`
        INSERT INTO g_kentei_attempts (userId, date, score, category, totalQuestions, wrongQuestionIds, userAnswers) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    `, [userId, date, score, category, totalQuestions, JSON.stringify(wrongQuestionIds), JSON.stringify(userAnswers)]);
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/attempts', async (req, res) => {
  const { userId } = req.query;
  try {
    await pool.query('DELETE FROM g_kentei_attempts WHERE userId = $1', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions', async (req, res) => {
  const { userId, category } = req.query;
  try {
    if (category) {
      const result = await pool.query('SELECT * FROM g_kentei_sessions WHERE userId = $1 AND category = $2', [userId, category]);
      const session = result.rows[0];
      if (session) {
        session.answers = typeof session.answers === 'string' ? JSON.parse(session.answers || '[]') : session.answers;
      }
      res.json(session || null);
    } else {
      const result = await pool.query('SELECT * FROM g_kentei_sessions WHERE userId = $1', [userId]);
      const sessions = result.rows.map(s => {
        s.answers = typeof s.answers === 'string' ? JSON.parse(s.answers || '[]') : s.answers;
        return s;
      });
      res.json(sessions);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions', async (req, res) => {
  const { userId, category, currentQuestionIndex, answers } = req.body;
  try {
    await pool.query(`
        INSERT INTO g_kentei_sessions (userId, category, currentQuestionIndex, answers, lastUpdated) 
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (userId, category) DO UPDATE SET 
            currentQuestionIndex = EXCLUDED.currentQuestionIndex, 
            answers = EXCLUDED.answers, 
            lastUpdated = CURRENT_TIMESTAMP
    `, [userId, category, currentQuestionIndex, JSON.stringify(answers)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/sessions/:id', async (req, res) => {
  const [userId, category] = req.params.id.split(',');
  const { currentQuestionIndex, answers } = req.body;
  try {
    if (answers) {
      await pool.query('UPDATE g_kentei_sessions SET currentQuestionIndex = $1, answers = $2, lastUpdated = CURRENT_TIMESTAMP WHERE userId = $3 AND category = $4', [currentQuestionIndex, JSON.stringify(answers), userId, category]);
    } else {
      await pool.query('UPDATE g_kentei_sessions SET currentQuestionIndex = $1, lastUpdated = CURRENT_TIMESTAMP WHERE userId = $2 AND category = $3', [currentQuestionIndex, userId, category]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  const [userId, category] = req.params.id.split(',');
  try {
    await pool.query('DELETE FROM g_kentei_sessions WHERE userId = $1 AND category = $2', [userId, category]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sessions', async (req, res) => {
  const { userId } = req.query;
  try {
    await pool.query('DELETE FROM g_kentei_sessions WHERE userId = $1', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user-progress/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const qRes = await pool.query('SELECT id, category, correctanswer FROM g_kentei_questions');
    const questions = qRes.rows;

    const aRes = await pool.query('SELECT category, wrongQuestionIds, userAnswers FROM g_kentei_attempts WHERE userId = $1', [userId]);
    const attempts = aRes.rows;

    const sRes = await pool.query('SELECT * FROM g_kentei_sessions WHERE userId = $1', [userId]);
    const sessions = sRes.rows;

    const solvedMap = new Set();
    const failedMap = new Set();

    // Process Attempts First
    attempts.forEach(a => {
      const wrongIds = typeof a.wrongQuestionIds === 'string' ? JSON.parse(a.wrongQuestionIds || '[]') : a.wrongQuestionIds;
      const userAnswers = typeof a.userAnswers === 'string' ? JSON.parse(a.userAnswers || '{}') : a.userAnswers;

      Object.keys(userAnswers).forEach(qId => {
        const id = parseInt(qId);
        if (!wrongIds.includes(id)) {
          solvedMap.add(id);
          failedMap.delete(id);
        } else {
          if (!solvedMap.has(id)) {
            failedMap.add(id);
          }
        }
      });
    });

    // Process Active Sessions for Real-time Updates
    sessions.forEach(session => {
      const catId = session.category;
      const answers = typeof session.answers === 'string' ? JSON.parse(session.answers || '[]') : session.answers;

      const catQuestions = questions.filter(q => q.category === catId).sort((a, b) => a.id - b.id);

      answers.forEach((ans, idx) => {
        if (ans !== null && ans !== undefined && catQuestions[idx]) {
          const q = catQuestions[idx];
          const isCorrect = ans === q.correctanswer;

          if (isCorrect) {
            solvedMap.add(q.id);
            failedMap.delete(q.id);
          } else {
            if (!solvedMap.has(q.id)) {
              failedMap.add(q.id);
            }
          }
        }
      });
    });

    const categoryStats = {};
    const categoriesRes = await pool.query('SELECT id FROM g_kentei_categories');
    categoriesRes.rows.forEach(cat => {
      const catId = cat.id;
      const catQuestions = questions.filter(q => q.category === catId);
      const solved = catQuestions.filter(q => solvedMap.has(q.id)).length;
      const failed = catQuestions.filter(q => failedMap.has(q.id)).length;

      categoryStats[catId] = {
        total: catQuestions.length,
        solved,
        failed,
        remaining: catQuestions.length - solved - failed
      };
    });

    res.json(categoryStats);
  } catch (err) {
    console.error('[Progress API Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/diagnostics', async (req, res) => {
  try {
    const usersCount = await pool.query('SELECT count(*) as count FROM g_kentei_users');
    const attemptsCount = await pool.query('SELECT count(*) as count FROM g_kentei_attempts');
    const sessionsCount = await pool.query('SELECT count(*) as count FROM g_kentei_sessions');
    const recent = await pool.query('SELECT * FROM g_kentei_attempts ORDER BY date DESC LIMIT 5');
    res.json({
      counts: {
        users: parseInt(usersCount.rows[0].count),
        attempts: parseInt(attemptsCount.rows[0].count),
        sessions: parseInt(sessionsCount.rows[0].count)
      },
      recentAttempts: recent.rows,
      dbStatus: 'Connected to Postgres Sector'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM g_kentei_users WHERE userId = $1', [req.params.id]);
    cache.invalidate('user');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Weak Points Analysis Endpoint
app.get('/api/user-progress/:userId/weak-points', async (req, res) => {
  const { userId } = req.params;
  try {
    // Optimized SQL Aggregation
    // Extracts wrong question IDs from the JSON array in 'wrongQuestionIds' column
    // Casts them to integers, counts occurrences, and returns top 20
    const query = `
            SELECT
                value::int as "questionId",
                COUNT(*) as "incorrectCount"
            FROM
                g_kentei_attempts,
                LATERAL jsonb_array_elements_text(wrongQuestionIds::jsonb) as value
            WHERE
                userId = $1
            GROUP BY
                value
            ORDER BY
                "incorrectCount" DESC
            LIMIT 20;
        `;

    const result = await pool.query(query, [userId]);

    // Map postgres lowercase columns if needed, but alias handles it mostly
    // jsonb_array_elements_text returns text, casting to int in SQL
    // result.rows will have { questionId: 123, incorrectCount: '5' } (count is string in pg)

    const weakPoints = result.rows.map(row => ({
      questionId: parseInt(row.questionId),
      incorrectCount: parseInt(row.incorrectCount)
    }));

    res.json(weakPoints);
  } catch (e) {
    // Fallback to JS processing if JSON parsing fails in SQL (e.g. invalid JSON in DB)
    logger.error("SQL Aggregation failed, falling back to JS:", e.message);
    try {
      const attemptsRes = await pool.query(`
                SELECT wrongQuestionIds FROM g_kentei_attempts WHERE userId = $1
            `, [userId]);

      const wrongCounts = {};
      attemptsRes.rows.forEach(row => {
        let ids = row.wrongquestionids;
        if (typeof ids === 'string') {
          try { ids = JSON.parse(ids); } catch (e) { }
        }
        if (Array.isArray(ids)) {
          ids.forEach(qid => {
            wrongCounts[qid] = (wrongCounts[qid] || 0) + 1;
          });
        }
      });

      const weakPoints = Object.entries(wrongCounts)
        .map(([qid, count]) => ({ questionId: parseInt(qid), incorrectCount: count }))
        .sort((a, b) => b.incorrectCount - a.incorrectCount)
        .slice(0, 20);

      res.json(weakPoints);
    } catch (fallbackError) {
      logger.error("Fallback failed:", fallbackError);
      res.status(500).json({ error: fallbackError.message });
    }
  }
});

import fs from 'fs/promises';
import { existsSync } from 'fs';

// --- Self-Study APIs ---
app.get('/api/study-guides', async (req, res) => {
  try {
    const guidesDir = join(__dirname, '../docs/study_guide');
    if (!existsSync(guidesDir)) {
      return res.json([]);
    }
    const files = await fs.readdir(guidesDir);
    const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'INDEX.md');
    res.json(mdFiles.sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/study-guides/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    // Basic security check to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filepath = join(__dirname, '../docs/study_guide', filename);
    if (!existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const content = await fs.readFile(filepath, 'utf-8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User Notes APIs
app.get('/api/notes/:userId/:documentId', async (req, res) => {
  try {
    const { userId, documentId } = req.params;
    const result = await pool.query('SELECT noteContent FROM g_kentei_user_notes WHERE userId = $1 AND documentId = $2', [userId, documentId]);
    if (result.rows.length > 0) {
      res.json({ noteContent: result.rows[0].notecontent });
    } else {
      res.json({ noteContent: '' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { userId, documentId, noteContent } = req.body;
    if (!userId || !documentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await pool.query(`
      INSERT INTO g_kentei_user_notes (userId, documentId, noteContent, lastUpdated)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (userId, documentId)
      DO UPDATE SET noteContent = EXCLUDED.noteContent, lastUpdated = CURRENT_TIMESTAMP
    `, [userId, documentId, noteContent]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Error Management APIs ---

app.post('/api/errors', async (req, res) => {
  try {
    const { screenId, errorMessage, errorStack } = req.body;

    // Generate unique error ID
    const errorId = `ERR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Save to DB
    await pool.query(`
      INSERT INTO g_kentei_error_logs (errorId, screenId, errorMessage, errorStack)
      VALUES ($1, $2, $3, $4)
    `, [errorId, screenId, errorMessage, errorStack]);

    // Log to Winston
    logger.error(`[Frontend Error] ${errorId} - ${screenId} - ${errorMessage}`, { stack: errorStack });

    res.json({ success: true, errorId });
  } catch (err) {
    logger.error('[API Error] Failed to save error log', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/errors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM g_kentei_error_logs ORDER BY createdAt DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    logger.error('[API Error] Failed to fetch error logs', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/errors/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['未確認', '確認中', '対応済'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    await pool.query('UPDATE g_kentei_error_logs SET status = $1 WHERE errorId = $2', [status, id]);
    res.json({ success: true });
  } catch (err) {
    logger.error('[API Error] Failed to update error status', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Serve static files from the dist directory
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));

  // SPA fallback - serve index.html for all non-API routes that aren't files/API
  app.use((req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, { error: err.stack });
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3012;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Neural Backend connected to Postgres Sector: http://localhost:${PORT}`);
});
