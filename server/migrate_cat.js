import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db', ssl: { rejectUnauthorized: false }});

const map = {
    'ai_basics': '人工知能（AI）とは',
    'ai_trends': '人工知能をめぐる動向',
    'ml_methods': '機械学習の具体的手法',
    'dl_overview': 'ディープラーニングの概要',
    'dl_methods': 'ディープラーニングの手法',
    'dl_implementation': 'ディープラーニングの社会実装に向けて',
    'math_stats': '数理・統計',
    'law_contracts': '法律・契約',
    'ethics_governance': '倫理・ガバナンス'
};

async function migrate() {
    try {
        console.log('Starting migration...');
        for (const [en, ja] of Object.entries(map)) {
            console.log(`Updating ${en} to ${ja}`);
            
            try { await pool.query('UPDATE g_kentei_questions SET category = $1 WHERE category = $2', [ja, en]); } catch(e) { console.log('q error', e.message); }
            try { await pool.query('UPDATE g_kentei_attempts SET category = $1 WHERE category = $2', [ja, en]); } catch(e) { console.log('a error', e.message); }
            try { await pool.query('UPDATE g_kentei_sessions SET category = $1 WHERE category = $2', [ja, en]); } catch(e) { console.log('s error', e.message); }
            try { await pool.query('UPDATE g_kentei_submitted_questions SET category = $1 WHERE category = $2', [ja, en]); } catch(e) { console.log('sq error', e.message); }
            
            try {
                const cat = await pool.query('SELECT * FROM g_kentei_categories WHERE id = $1', [en]);
                if (cat.rows.length > 0) {
                    const c = cat.rows[0];
                    await pool.query(`
                        INSERT INTO g_kentei_categories (id, title, icon, color, bg, description, displayOrder)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (id) DO NOTHING
                    `, [ja, c.title, c.icon, c.color, c.bg, c.description, c.displayorder]);
                    await pool.query('DELETE FROM g_kentei_categories WHERE id = $1', [en]);
                }
            } catch (e) { console.log('cat error', e.message); }
        }
        console.log('Migration complete!');
    } catch(err) {
        console.error('Error during migration:', err);
    } finally {
        await pool.end();
    }
}
migrate();
