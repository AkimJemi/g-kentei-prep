import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

// Initialize Database Schema
const initDB = async () => {
  const client = await pool.connect();
  try {
    console.log('[Neural DB] Applying Schema Manifest...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        nickname TEXT,
        role TEXT,
        status TEXT DEFAULT 'active',
        joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attempts (
        id SERIAL PRIMARY KEY,
        userId TEXT REFERENCES users(userId),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        score INTEGER,
        totalQuestions INTEGER,
        category TEXT,
        wrongQuestionIds TEXT,
        userAnswers TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        userId TEXT REFERENCES users(userId),
        category TEXT,
        currentQuestionIndex INTEGER,
        answers TEXT,
        lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(userId, category)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        userId TEXT REFERENCES users(userId),
        name TEXT,
        email TEXT,
        topic TEXT,
        message TEXT,
        reply TEXT,
        repliedAt TIMESTAMP,
        status TEXT DEFAULT 'unread',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        userId TEXT REFERENCES users(userId),
        title TEXT,
        content TEXT,
        type TEXT DEFAULT 'info',
        isRead INTEGER DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS submitted_questions (
        id SERIAL PRIMARY KEY,
        category TEXT,
        question TEXT,
        options TEXT,
        correctAnswer INTEGER,
        explanation TEXT,
        status TEXT DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        task TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        category TEXT DEFAULT 'general',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        category TEXT,
        question TEXT,
        options TEXT,
        correctAnswer INTEGER,
        explanation TEXT,
        translations TEXT,
        source TEXT DEFAULT 'system',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS public_chat (
          id SERIAL PRIMARY KEY,
          userId TEXT REFERENCES users(userId),
          message TEXT,
          replyTo INTEGER, 
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        title TEXT,
        icon TEXT,
        color TEXT,
        bg TEXT,
        description TEXT,
        displayOrder INTEGER DEFAULT 0
      );
    `);

    // Seed Categories if empty
    const catRes = await client.query('SELECT count(*) as count FROM categories');
    if (parseInt(catRes.rows[0].count) === 0) {
        console.log('[Neural DB] Seeding Initial Categories...');
        const initialCategories = [
            { id: 'AI Fundamentals', title: 'AIの基礎', icon: 'Brain', color: 'text-blue-400', bg: 'bg-blue-400/10', description: 'AIの定義、歴史、基礎知識を学びます。' },
            { id: 'AI Trends', title: 'AIをめぐる動向', icon: 'Cpu', color: 'text-indigo-400', bg: 'bg-indigo-400/10', description: '最新のAI技術開発と社会動向を確認します。' },
            { id: 'Machine Learning', title: '機械学習の概要', icon: 'Database', color: 'text-emerald-400', bg: 'bg-emerald-400/10', description: '学習アルゴリズムとモデル構築の基礎を学習します。' },
            { id: 'Deep Learning Basics', title: 'ディープラーニングの概要', icon: 'Zap', color: 'text-amber-400', bg: 'bg-amber-400/10', description: 'ニューラルネットワークの基礎理論を習得します。' },
            { id: 'Deep Learning Tech', title: 'ディープラーニングの手法', icon: 'Layers', color: 'text-rose-400', bg: 'bg-rose-400/10', description: 'CNN, RNN等の具体的なニューラルネット手法を学びます。' },
            { id: 'AI Applications', title: 'ディープラーニングの応用例', icon: 'Globe', color: 'text-sky-400', bg: 'bg-sky-400/10', description: '画像認識、自然言語処理等の応用事例を確認します。' },
            { id: 'Social Implementation', title: 'AIの社会実装に向けて', icon: 'Shield', color: 'text-purple-400', bg: 'bg-purple-400/10', description: 'ビジネス実装、プロジェクト管理、倫理について学びます。' },
            { id: 'Math & Statistics', title: '数理・統計', icon: 'Terminal', color: 'text-slate-400', bg: 'bg-slate-400/10', description: 'AI理解に必要な数学的基礎を固めます。' },
            { id: 'Law & Contracts', title: '法律・契約', icon: 'BookOpen', color: 'text-teal-400', bg: 'bg-teal-400/10', description: '知的財産権、著作権、個人情報保護法等を学びます。' },
            { id: 'Ethics & Governance', title: '倫理・ガバナンス', icon: 'Award', color: 'text-orange-400', bg: 'bg-orange-400/10', description: 'AI倫理指針とリスクガバナンスを学習します。' }
        ];

        for (const [idx, cat] of initialCategories.entries()) {
            await client.query(`
                INSERT INTO categories (id, title, icon, color, bg, description, displayOrder)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [cat.id, cat.title, cat.icon, cat.color, cat.bg, cat.description, idx]);
        }
        console.log('[Neural DB] Categories Seeded.');
    }

    // Seed Admin User if empty
    const userRes = await client.query('SELECT count(*) as count FROM users');
    if (parseInt(userRes.rows[0].count) === 0) {
        console.log('[Neural DB] Seeding Admin Overlord...');
        await client.query(`
            INSERT INTO users (userId, nickname, role)
            VALUES ($1, $2, $3)
        `, ['jemin.kim', 'Akim', 'admin']);
        console.log('[Neural DB] Admin Seeded.');
    }
    console.log('[Neural DB] Schema Manifest Integrated.');
  } catch (err) {
    console.error('[Neural DB] Schema Integration Failed:', err);
  } finally {
    client.release();
  }
};

initDB();

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
(async () => {
    await migrateTable('messages', [
        { name: 'userId', type: 'TEXT' },
        { name: 'reply', type: 'TEXT' },
        { name: 'repliedAt', type: 'TIMESTAMP' },
        { name: 'status', type: 'TEXT DEFAULT \'unread\'' }
    ]);
    await migrateTable('public_chat', [
        { name: 'replyTo', type: 'INTEGER' }
    ]);
})();

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
  
  const validSortColumns = ['id', 'category', 'createdAt', 'joinedAt', 'date', 'name', 'username', 'topic', 'status', 'role', 'type', 'title', 'question'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'id';
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
        const result = await pool.query('SELECT * FROM categories ORDER BY displayOrder ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/categories', async (req, res) => {
    const { id, title, icon, color, bg, description, displayOrder } = req.body;
    try {
        await pool.query(`
            INSERT INTO categories (id, title, icon, color, bg, description, displayOrder)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, title, icon, color, bg, description, displayOrder || 0]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/categories/:id', async (req, res) => {
    const { title, icon, color, bg, description, displayOrder } = req.body;
    try {
        await pool.query(`
            UPDATE categories 
            SET title = $1, icon = $2, color = $3, bg = $4, description = $5, displayOrder = $6
            WHERE id = $7
        `, [title, icon, color, bg, description, displayOrder, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/categories/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


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
app.get('/api/questions', async (req, res) => {
  try {
    const { page, limit, search, category } = req.query;
    const usePagination = page !== undefined || limit !== undefined || search !== undefined || category !== undefined;
    
    if (!usePagination) {
        const result = await pool.query('SELECT * FROM questions');
        const questions = result.rows.map(q => ({
            ...q,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
            translations: q.translations ? (typeof q.translations === 'string' ? JSON.parse(q.translations) : q.translations) : undefined
        }));
        return res.json(questions);
    }

    const { data, pagination } = await getPaginatedData('questions', req, ['question', 'category', 'explanation']);
    const formatted = data.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        translations: q.translations ? (typeof q.translations === 'string' ? JSON.parse(q.translations) : q.translations) : undefined
    }));
    res.json({ data: formatted, pagination });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/questions', async (req, res) => {
   const { category, question, options, correctAnswer, explanation, translations, source } = req.body;
   try {
     const result = await pool.query(`
       INSERT INTO questions (category, question, options, correctAnswer, explanation, translations, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id
     `, [category, question, JSON.stringify(options), correctAnswer, explanation, JSON.stringify(translations || {}), source || 'admin']);
     res.json({ success: true, id: result.rows[0].id });
   } catch (err) {
     res.status(500).json({ error: err.message });
   }
});

app.put('/api/admin/questions/:id', async (req, res) => {
    const { category, question, options, correctAnswer, explanation, translations } = req.body;
    try {
        await pool.query(`
            UPDATE questions 
            SET category = $1, question = $2, options = $3, correctAnswer = $4, explanation = $5, translations = $6
            WHERE id = $7
        `, [category, question, JSON.stringify(options), correctAnswer, explanation, JSON.stringify(translations || {}), req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/questions/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, topic, message, userId } = req.body;
  try {
    await pool.query(`
      INSERT INTO messages (name, email, topic, message, userId) 
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
      INSERT INTO submitted_questions (category, question, options, correctAnswer, explanation) 
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
            FROM messages m 
            LEFT JOIN users u ON m.userId = u.userId 
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
    const countRes = await pool.query(`SELECT count(*) as total FROM messages m ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].total);

    const validSortColumns = ['id', 'createdAt', 'name', 'topic', 'status'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'id';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    const offset = (parseInt(page || 1) - 1) * parseInt(limit || 10);
    const dataRes = await pool.query(`
        SELECT m.*, u.nickname 
        FROM messages m 
        LEFT JOIN users u ON m.userId = u.userId 
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
    const msgRes = await pool.query('SELECT * FROM messages WHERE id = $1', [id]);
    const msg = msgRes.rows[0];
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    await pool.query('UPDATE messages SET reply = $1, repliedAt = CURRENT_TIMESTAMP, status = $2 WHERE id = $3', [reply, 'replied', id]);

    if (msg.userId) {
        await pool.query(`
            INSERT INTO notifications (userId, title, content, type) 
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
        const result = await pool.query('SELECT * FROM submitted_questions WHERE status = $1 ORDER BY createdAt DESC', ['pending']);
        return res.json(result.rows);
    }
    const result = await getPaginatedData('submitted_questions', req, ['category', 'question']);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/submissions/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const subRes = await pool.query('SELECT * FROM submitted_questions WHERE id = $1', [id]);
    const submission = subRes.rows[0];
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    await pool.query(`
      INSERT INTO questions (category, question, options, correctAnswer, explanation, source)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [submission.category, submission.question, submission.options, submission.correctAnswer, submission.explanation, 'user_contribution']);

    await pool.query('UPDATE submitted_questions SET status = $1 WHERE id = $2', ['approved', id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/submissions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE submitted_questions SET status = $1 WHERE id = $2', ['rejected', id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/approved-questions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM submitted_questions WHERE status = $1', ['approved']);
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

app.get('/api/users', async (req, res) => {
    try {
        const { page, limit, search } = req.query;
        const usePagination = page !== undefined || limit !== undefined || search !== undefined;
        
        if (!usePagination) {
            const result = await pool.query('SELECT * FROM users');
            return res.json(result.rows);
        }
        const result = await getPaginatedData('users', req, ['userId', 'nickname', 'role']);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/users/:key', async (req, res) => {
  const { key } = req.params;
  const result = await pool.query('SELECT * FROM users WHERE LOWER(userId) = LOWER($1)', [key]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(result.rows[0]);
});

app.post('/api/users', async (req, res) => {
  const { userId, nickname, role } = req.body;
  if (!userId || !nickname) return res.status(400).json({ error: 'ユーザーIDとニックネームは必須です' });
  if (!/^[a-zA-Z0-9._-]+$/.test(userId)) return res.status(400).json({ error: 'ユーザーIDは英数字、ドット(.)、アンダースコア(_)、ハイフン(-)のみ使用できます' });
  
  try {
    await pool.query('INSERT INTO users (userId, nickname, role) VALUES ($1, $2, $3)', [userId, nickname, role]);
    const user = await pool.query('SELECT * FROM users WHERE userId = $1', [userId]);
    res.json(user.rows[0]);
  } catch (err) {
    if (err.message.includes('unique') || err.code === '23505') {
      res.status(400).json({ error: 'このユーザーIDは既に使用されています' });
    } else {
      res.status(500).json({ error: err.message });
    }
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
            FROM public_chat c
            LEFT JOIN users u ON c.userId = u.userId
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
        const insertRes = await pool.query('INSERT INTO public_chat (userId, message, replyTo) VALUES ($1, $2, $3) RETURNING id', [userId, message, replyTo || null]);
        const newMsg = await pool.query(`
            SELECT 
                c.*, 
                u.nickname, 
                u.role 
            FROM public_chat c
            LEFT JOIN users u ON c.userId = u.userId
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
        const userRes = await pool.query('SELECT role FROM users WHERE userId = $1', [userId]);
        const user = userRes.rows[0];
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized: Admin access required' });
        }

        const deleteRes = await pool.query('DELETE FROM public_chat WHERE id = $1', [id]);
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
    await pool.query('UPDATE users SET status = $1 WHERE userId = $2', [status, id]);
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
        const query = `SELECT * FROM notifications ${whereClause} ORDER BY ${safeSortBy} ${safeOrder}`;
        const result = await pool.query(query, params);
        return res.json(result.rows);
    }
    
    const offset = (parseInt(page || 1) - 1) * parseInt(limit || 10);
    const countRes = await pool.query(`SELECT count(*) as total FROM notifications ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].total);

    const dataRes = await pool.query(`SELECT * FROM notifications ${whereClause} ORDER BY ${safeSortBy} ${safeOrder} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`, [...params, parseInt(limit || 10), offset]);

    res.json({ data: dataRes.rows, pagination: { total, page: parseInt(page || 1), limit: parseInt(limit || 10), pages: Math.ceil(total / parseInt(limit || 10)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/todos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM todos ORDER BY status DESC, createdAt DESC');
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/todos', async (req, res) => {
    const { task, priority, category } = req.body;
    try {
        const result = await pool.query('INSERT INTO todos (task, priority, category) VALUES ($1, $2, $3) RETURNING *', [task, priority || 'medium', category || 'general']);
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.patch('/api/admin/todos/:id', async (req, res) => {
    const { status, task, priority } = req.body;
    try {
        if (status) {
            await pool.query('UPDATE todos SET status = $1 WHERE id = $2', [status, req.params.id]);
        } else if (task) {
            await pool.query('UPDATE todos SET task = $1, priority = $2 WHERE id = $3', [task, priority, req.params.id]);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/todos/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM todos WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/notifications', async (req, res) => {
  const { userId, title, content, type } = req.body;
  try {
    await pool.query('INSERT INTO notifications (userId, title, content, type) VALUES ($1, $2, $3, $4)', [userId || null, title, content, type || 'info']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET isRead = 1 WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/attempts', async (req, res) => {
  try {
    const { userId, sort } = req.query;
    let sql = 'SELECT * FROM attempts';
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
        INSERT INTO attempts (userId, date, score, category, totalQuestions, wrongQuestionIds, userAnswers) 
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
    await pool.query('DELETE FROM attempts WHERE userId = $1', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions', async (req, res) => {
  const { userId, category } = req.query;
  try {
    if (category) {
        const result = await pool.query('SELECT * FROM sessions WHERE userId = $1 AND category = $2', [userId, category]);
        const session = result.rows[0];
        if (session) {
            session.answers = typeof session.answers === 'string' ? JSON.parse(session.answers || '[]') : session.answers;
        }
        res.json(session || null);
    } else {
        const result = await pool.query('SELECT * FROM sessions WHERE userId = $1', [userId]);
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
        INSERT INTO sessions (userId, category, currentQuestionIndex, answers, lastUpdated) 
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
        await pool.query('UPDATE sessions SET currentQuestionIndex = $1, answers = $2, lastUpdated = CURRENT_TIMESTAMP WHERE userId = $3 AND category = $4', [currentQuestionIndex, JSON.stringify(answers), userId, category]);
    } else {
        await pool.query('UPDATE sessions SET currentQuestionIndex = $1, lastUpdated = CURRENT_TIMESTAMP WHERE userId = $2 AND category = $3', [currentQuestionIndex, userId, category]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  const [userId, category] = req.params.id.split(',');
  try {
    await pool.query('DELETE FROM sessions WHERE userId = $1 AND category = $2', [userId, category]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sessions', async (req, res) => {
  const { userId } = req.query;
  try {
    await pool.query('DELETE FROM sessions WHERE userId = $1', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/diagnostics', async (req, res) => {
  try {
    const usersCount = await pool.query('SELECT count(*) as count FROM users');
    const attemptsCount = await pool.query('SELECT count(*) as count FROM attempts');
    const sessionsCount = await pool.query('SELECT count(*) as count FROM sessions');
    const recent = await pool.query('SELECT * FROM attempts ORDER BY date DESC LIMIT 5');
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
    await pool.query('DELETE FROM users WHERE userId = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback - serve index.html for all non-API routes
if (process.env.NODE_ENV === 'production') {
  app.get(/(.*)/, (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3012;
app.listen(PORT, () => {
  console.log(`Neural Backend connected to Postgres Sector: http://localhost:${PORT}`);
});
