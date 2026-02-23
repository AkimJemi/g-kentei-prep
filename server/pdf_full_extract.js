import { GoogleGenAI } from '@google/genai';
import pkg from 'pg';
import { readFileSync } from 'fs';
const { Pool } = pkg;
const require = (await import('module')).createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const pool = new Pool({
  connectionString: 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db',
  ssl: { rejectUnauthorized: false }
});
const delay = ms => new Promise(r => setTimeout(r, ms));

const PDF_DIR = 'C:/Users/wowp1/Downloads/G検定/';
const PDF_MAP = [
  { file: '人工知能とは.pdf',                        category: '人工知能とは' },
  { file: '人工知能をめぐる動向.pdf',                category: '人工知能をめぐる動向' },
  { file: '機械学習の具体的手法.pdf',                category: '機械学習の概要' },
  { file: 'ディープラーニングの概要.pdf',            category: 'ディープラーニングの概要' },
  { file: 'ディープラーニングの要素技術.pdf',        category: 'ディープラーニングの要素技術' },
  { file: 'ディープラーニングの応用例.pdf',          category: 'ディープラーニングの応用例' },
  { file: 'ディープラーニングの社会実装に向けて.pdf',category: 'AIの社会実装に向けて' },
  { file: 'AIに必要な数理・統計知識①+.pdf',         category: 'AIに必要な数理・統計知識' },
  { file: 'AIに必要な数理・統計知識②.pdf',          category: 'AIに必要な数理・統計知識' },
  { file: 'AIに関する法律と契約.pdf',               category: 'AIに関する法律と契約' },
  { file: 'AI倫理・AIガバナンス.pdf',               category: 'AI倫理・AIガバナンス' },
];

const CHUNK_SIZE = 8000; // chars per chunk

// PDFをテキストに変換
async function extractText(filePath) {
  const buf = readFileSync(filePath);
  const data = await pdfParse(buf);
  return data.text.replace(/\s+/g, ' ').trim();
}

// テキストをチャンクに分割
function splitChunks(text, size) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

// Geminiで問題生成（制限なし）
async function generateQuestions(category, chunk, chunkIdx, totalChunks, retries = 3) {
  const prompt = `あなたはG検定（JDLA G検定）の問題作成専門家です。
以下の教材テキスト（${category} の第${chunkIdx+1}/${totalChunks}部分）から、G検定レベルの4択問題をできるだけ多く作成してください。
この教材内容から出題できる問題はすべて作成してください。数に制限はありません。

【ルール】
- 教材の内容に基づいた正確な問題であること
- 選択肢は4つ、正解インデックスは0〜3
- すべて日本語
- 各選択肢の解説（optionExplanations）を4つ必ず付けること
- 重複問題は作らないこと
- JSONのみを返すこと

【教材テキスト】
${chunk}

【出力フォーマット（JSONのみ）】
[{"question":"問題文","options":["選択肢0","選択肢1","選択肢2","選択肢3"],"correctAnswer":0,"explanation":"解説","optionExplanations":["選択肢0の解説","選択肢1の解説","選択肢2の解説","選択肢3の解説"]}]`;

  for (let i = 0; i < retries; i++) {
    try {
      const res = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        }),
        new Promise((_, r) => setTimeout(() => r(new Error('Timeout 120s')), 120000))
      ]);
      const text = res.text.replace(/^```json?\n?/im, '').replace(/```$/m, '').trim();
      const qs = JSON.parse(text);
      if (Array.isArray(qs)) return qs;
      throw new Error('not array');
    } catch (e) {
      if (e.status === 429 || e.message?.includes('429')) {
        console.log(`    [429] 30秒待機...`);
        await delay(30000);
      } else if (e.message?.includes('503') || e.message?.includes('overloaded')) {
        console.log(`    [503] 20秒待機...`);
        await delay(20000);
      } else {
        console.error(`    [Attempt ${i+1}] ${e.message?.slice(0, 80)}`);
        if (i < retries - 1) await delay(5000);
      }
    }
  }
  return [];
}

// DB挿入（シーケンスリセット済みを前提）
async function insertQuestions(client, category, questions) {
  let added = 0;
  for (const q of questions) {
    if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) continue;
    try {
      await client.query(
        `INSERT INTO g_kentei_questions (category,question,options,correctAnswer,explanation,optionExplanations,source)
         VALUES ($1,$2,$3,$4,$5,$6,'pdf_full')`,
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
      if (e.message?.includes('duplicate')) {
        // 重複はスキップ（シーケンスのみリセット）
      } else {
        console.error(`    INSERT失敗: ${e.message?.slice(0, 60)}`);
      }
    }
  }
  return added;
}

async function main() {
  // シーケンスを最新にリセット
  const client = await pool.connect();
  await client.query(`SELECT setval('g_kentei_questions_id_seq', (SELECT MAX(id) FROM g_kentei_questions))`);
  console.log('✅ シーケンスリセット完了\n');

  let grandTotal = 0;

  for (const { file, category } of PDF_MAP) {
    console.log(`\n========================================`);
    console.log(`📄 ${file}`);
    console.log(`   カテゴリ: ${category}`);

    let text;
    try {
      text = await extractText(PDF_DIR + file);
      console.log(`   テキスト: ${text.length}文字`);
    } catch (e) {
      console.error(`   ❌ PDF読み込み失敗: ${e.message}`);
      continue;
    }

    const chunks = splitChunks(text, CHUNK_SIZE);
    console.log(`   チャンク数: ${chunks.length}`);

    let fileTotal = 0;
    for (let ci = 0; ci < chunks.length; ci++) {
      process.stdout.write(`   [${ci + 1}/${chunks.length}] Gemini生成中...`);
      const questions = await generateQuestions(category, chunks[ci], ci, chunks.length);
      process.stdout.write(` ${questions.length}問生成`);

      const added = await insertQuestions(client, category, questions);
      fileTotal += added;
      console.log(` → ${added}問追加`);

      await delay(2000); // API負荷軽減
    }

    console.log(`   ✅ ${file}: 合計 ${fileTotal}問追加`);
    grandTotal += fileTotal;
    await delay(3000);
  }

  // 最終集計
  console.log('\n==========================================');
  console.log('=== 最終カテゴリ別問題数 ===');
  const res = await client.query(
    `SELECT c.title, COUNT(q.id) cnt FROM g_kentei_categories c
     LEFT JOIN g_kentei_questions q ON q.category=c.id
     GROUP BY c.title, c.displayorder ORDER BY c.displayorder ASC`
  );
  let total = 0;
  res.rows.forEach(r => {
    console.log(`  ${r.title}: ${r.cnt}問`);
    total += parseInt(r.cnt);
  });
  console.log(`\n🎉 合計: ${total}問 | 今回追加: ${grandTotal}問`);

  client.release();
  await pool.end();
}

main().catch(console.error);
