import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import pkg from 'pg';
const { Pool } = pkg;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const pool = new Pool({
  connectionString: 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db',
  ssl: { rejectUnauthorized: false }
});
const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  // テキスト抽出
  const pyOut = execSync('python server/extract_last2.py', {
    encoding: 'utf8', stdio: ['pipe','pipe','pipe'],
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });
  const data = JSON.parse(pyOut);
  const client = await pool.connect();

  for (const { category, text, chars } of data) {
    console.log(`\n📄 ${category} (${chars}文字)`);
    if (chars < 100) { console.log('スキップ'); continue; }

    // Gemini生成
    process.stdout.write('Gemini生成中...');
    const prompt = `あなたはG検定専門家です。「${category}」に関するG検定レベルの4択問題を15問作成してください。
教材:${text.slice(0, 5000)}
JSONのみ出力:[{"question":"...","options":["A","B","C","D"],"correctAnswer":0,"explanation":"...","optionExplanations":["A解説","B解説","C解説","D解説"]}]`;

    let questions = [];
    for (let i = 0; i < 3; i++) {
      try {
        const res = await Promise.race([
          ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } }),
          new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 90000))
        ]);
        const txt = res.text.replace(/^```json?\n?/im, '').replace(/```$/m, '').trim();
        questions = JSON.parse(txt);
        if (Array.isArray(questions) && questions.length > 0) break;
      } catch (e) {
        console.error(`\n  Attempt ${i+1}: ${e.message?.slice(0, 60)}`);
        await delay(e.status === 429 ? 30000 : 5000);
      }
    }
    console.log(` ${questions.length}問生成`);

    // DB挿入（競合なし、単純INSERT）
    let added = 0;
    for (const q of questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) continue;
      try {
        await client.query(
          `INSERT INTO g_kentei_questions
           (category, question, options, correctAnswer, explanation, optionExplanations, source)
           VALUES ($1, $2, $3, $4, $5, $6, 'pdf')`,
          [
            category,
            q.question,
            JSON.stringify(q.options),
            typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
            q.explanation || '',
            JSON.stringify(q.optionExplanations || ['', '', '', ''])
          ]
        );
        added++;
      } catch (e) {
        console.error(`  INSERT失敗: ${e.message?.slice(0, 60)}`);
      }
    }
    console.log(`✅ ${added}問追加`);
    await delay(2000);
  }

  // 結果確認
  const res = await client.query(
    `SELECT c.title, COUNT(q.id) cnt FROM g_kentei_categories c
     LEFT JOIN g_kentei_questions q ON q.category = c.id
     GROUP BY c.title, c.displayorder ORDER BY c.displayorder`
  );
  let total = 0;
  console.log('\n=== 最終問題数 ===');
  res.rows.forEach(r => { console.log(`  ${r.title}: ${r.cnt}問`); total += parseInt(r.cnt); });
  console.log(`\n🎉 合計: ${total}問`);

  client.release();
  await pool.end();
}

main().catch(console.error);
