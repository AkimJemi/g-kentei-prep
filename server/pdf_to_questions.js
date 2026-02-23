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

async function generateQuestions(categoryName, pdfText, retries = 3) {
  const prompt = `
あなたはG検定（JDLA G検定）の問題作成専門家です。
以下の教材テキストを読み込み、「${categoryName}」カテゴリに相応しいG検定レベルの4択問題を15問生成してください。

【重要ルール】
- 教材の内容に基づいた問題であること
- 選択肢は4つ、正解インデックスは0〜3
- すべて日本語
- 各選択肢の解説（optionExplanations）も4つ必ず付けること
- JSONのみを返すこと（マークダウン・説明文不要）

【教材テキスト】
${pdfText}

【出力フォーマット（JSON配列のみ）】
[{"question":"問題文","options":["選択肢0","選択肢1","選択肢2","選択肢3"],"correctAnswer":0,"explanation":"全体解説","optionExplanations":["選択肢0の解説","選択肢1の解説","選択肢2の解説","選択肢3の解説"]}]
`;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await Promise.race([
        ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 60000))
      ]);
      let text = res.text.replace(/^```(json)?\n?/mi, '').replace(/```$/m, '').trim();
      const qs = JSON.parse(text);
      if (Array.isArray(qs) && qs.length > 0) return qs;
      throw new Error('Empty array');
    } catch (e) {
      if (e.status === 429 || e.message?.includes('429')) {
        console.log(`  [429] 20秒待機...`);
        await delay(20000);
      } else {
        console.error(`  [Attempt ${i+1}] ${e.message}`);
        await delay(3000);
      }
    }
  }
  return [];
}

async function main() {
  // Python でPDFテキスト抽出
  console.log('📚 PDFテキスト抽出中...');
  const pyOut = execSync('python server/extract_pdf.py', {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });

  const pdfData = JSON.parse(pyOut);
  console.log(`✅ ${pdfData.length}ファイル読み込み完了\n`);

  const client = await pool.connect();
  let totalAdded = 0;

  for (const { file, category, text, chars } of pdfData) {
    console.log(`\n📄 ${file}`);
    console.log(`   カテゴリ: ${category} | テキスト: ${chars}文字`);

    if (chars < 100) {
      console.log('   ⚠️  テキスト不足のためスキップ');
      continue;
    }

    process.stdout.write('   Gemini問題生成中...');
    const questions = await generateQuestions(category, text);
    console.log(` ${questions.length}問生成`);

    let added = 0;
    for (const q of questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) continue;
      await client.query(
        `INSERT INTO g_kentei_questions (category,question,options,correctAnswer,explanation,optionExplanations,source) VALUES ($1,$2,$3,$4,$5,$6,'pdf')`,
        [category, q.question, JSON.stringify(q.options), q.correctAnswer ?? 0, q.explanation ?? '', JSON.stringify(q.optionExplanations ?? ['','','',''])]
      );
      added++;
    }
    totalAdded += added;
    console.log(`   ✅ ${added}問追加`);
    await delay(2000);
  }

  // 最終確認
  console.log('\n=== 最終カテゴリ別問題数 ===');
  const res = await client.query(
    `SELECT c.title, COUNT(q.id) as cnt FROM g_kentei_categories c LEFT JOIN g_kentei_questions q ON q.category=c.id GROUP BY c.title, c.displayorder ORDER BY c.displayorder ASC`
  );
  let total = 0;
  res.rows.forEach(r => { console.log(`  ${r.title}: ${r.cnt}問`); total += parseInt(r.cnt); });
  console.log(`\n合計: ${total}問 | 今回追加: ${totalAdded}問`);

  client.release();
  await pool.end();
}

main().catch(console.error);
