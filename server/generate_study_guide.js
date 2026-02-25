/**
 * G検定 学習書生成スクリプト
 * PDFからテキストを抽出し、Gemini APIで学習書レベルに整形する
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir   = path.join(__dirname, '../docs/資料');
const outDir    = path.join(__dirname, '../docs/study_guide');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const domainMap = {
  '人工知能とは':                         '01_AI概論',
  '人工知能をめぐる動向':                 '02_AI動向',
  'AIに必要な数理・統計知識①':           '03_数理統計①',
  'AIに必要な数理・統計知識②':           '04_数理統計②',
  '機械学習の具体的手法':                 '05_機械学習',
  'ディープラーニングの概要':             '06_DL概要',
  'ディープラーニングの要素技術':         '07_DL要素技術',
  'ディープラーニングの応用例':           '08_DL応用',
  'ディープラーニングの社会実装に向けて': '09_DL社会実装',
  'AI倫理・AIガバナンス':                 '10_倫理ガバナンス',
  'AIに関する法律と契約':                 '11_法律契約',
};

const PDF_FILES = fs.readdirSync(docsDir)
  .filter(f => f.endsWith('.pdf'))
  .map(file => {
    const normalizedFile = file.normalize('NFC');
    const domainKey = Object.keys(domainMap).find(k => normalizedFile.includes(k.normalize('NFC')));
    const domain = domainKey ? domainMap[domainKey] : `99_${file.replace('.pdf', '')}`;
    const title  = file.replace(/\.pdf$/i, '').replace(/[+]+$/, '').trim();
    return { file, title, domain };
  })
  .sort((a, b) => a.domain.localeCompare(b.domain));

// テキストを最大トークン数に収まるようにチャンクに分割（約8000文字ずつ）
function splitIntoChunks(text, maxChars = 8000) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    // 段落境界で切る
    if (end < text.length) {
      const lastNewline = text.lastIndexOf('\n\n', end);
      if (lastNewline > start + 2000) end = lastNewline;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks;
}

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${err}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function generateStudyGuide(title, domain, rawText, pages) {
  const date = new Date().toISOString().split('T')[0];
  const label = domain.replace(/^\d+_/, '');
  const chunks = splitIntoChunks(rawText, 9000);
  
  console.log(`  → ${chunks.length}チャンクに分割して処理...`);

  let allSections = '';

  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`  → チャンク ${i + 1}/${chunks.length} 処理中...`);
    
    const isFirst = i === 0;
    const isLast  = i === chunks.length - 1;

    const prompt = `
あなたはG検定（ジェネラリスト検定）の試験対策専門の教育者です。
以下のスライド素材を、受験生が読みやすい**学習書形式のMarkdown**に整理してください。

## 指示

1. **スライドの断片を統合**して、流れのある文章・解説に変換する
2. 各概念を**わかりやすく説明**する（初学者にも理解できるよう）
3. 重要な用語は **太字** にする
4. 重要なポイントは以下の形式でコールアウトする：
   > 📌 **G検定頻出ポイント**: ここに重要事項を書く
5. 具体的な例や比喩を使って説明する
6. 表が適切な場合は表を使う
7. 章・節の見出しを適切に設定する（##, ### など）
8. 「作成者：○○」「©2024」などのメタ情報は削除する
9. スライドの繰り返しや冗長な部分は整理・統合する
10. 日本語として自然で読みやすい文体にする

## 出力形式

${isFirst ? `# ${title}\n\n> **G検定 学習ガイド** | 分野：${label} | ${pages}P | ${date}\n\n---\n\n` : ''}

各節は以下の構造で：
## 節タイトル

説明文（わかりやすく）

> 📌 **G検定頻出ポイント**: 試験で問われやすい重要事項

### サブ節（必要な場合）
詳細説明

---

## 変換するスライド素材（チャンク ${i + 1}/${chunks.length}）

${chunks[i]}

${isLast ? '\n\n最後に「## 📝 章末まとめ」を追加し、この分野の重要ポイントを箇条書きで整理してください。' : ''}
`;

    try {
      const result = await callGemini(prompt);
      allSections += result + '\n\n';
      console.log(' ✓');
    } catch (e) {
      console.error(` ERROR: ${e.message}`);
      // エラーの場合は元のテキストをそのまま追加
      allSections += `\n\n${chunks[i]}\n\n`;
    }

    // レート制限対策
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  return allSections;
}

async function processAll() {
  // 処理対象を引数で絞れる（例: node script.js 01）
  const targetFilter = process.argv[2];
  const targets = targetFilter
    ? PDF_FILES.filter(f => f.domain.startsWith(targetFilter))
    : PDF_FILES;

  console.log(`\n📚 G検定 学習ガイド生成 (${targets.length}/${PDF_FILES.length} files)\n`);

  const indexLines = [
    `# G検定 資格対策 学習ガイド\n\n`,
    `> Gemini AIによる学習書形式ノート | 生成日：${new Date().toISOString().split('T')[0]}\n\n`,
    `---\n\n`,
    `| # | 分野 | ページ数 | ステータス |\n`,
    `|---|------|----------|------------|\n`,
  ];

  for (const item of targets) {
    const pdfPath = path.join(docsDir, item.file);
    console.log(`\n[${item.domain}] ${item.title}`);
    
    try {
      const buf = fs.readFileSync(pdfPath);
      const data = await pdfParse(buf);
      const rawText = data.text
        .replace(/©\d{4}[^\n]*/g, '')
        .replace(/\n{4,}/g, '\n\n')
        .trim();

      process.stdout.write(`  → テキスト抽出: ${rawText.length}文字, ${data.numpages}P\n`);

      const md = await generateStudyGuide(item.title, item.domain, rawText, data.numpages);
      const outPath = path.join(outDir, `${item.domain}.md`);
      fs.writeFileSync(outPath, md, 'utf8');

      const wordCount = md.length;
      console.log(`  ✅ 完了 → ${item.domain}.md (${wordCount}文字)`);
      indexLines.push(`| ${item.domain.split('_')[0]} | [${item.title}](./${item.domain}.md) | ${data.numpages}P | ✅ 完了 |\n`);
    } catch (e) {
      console.error(`  ❌ エラー: ${e.message}`);
      indexLines.push(`| ${item.domain.split('_')[0]} | ${item.title} | - | ❌ エラー |\n`);
    }
  }

  indexLines.push(`\n---\n\n_Gemini AIにより自動生成された学習ガイドです_\n`);
  fs.writeFileSync(path.join(outDir, 'INDEX.md'), indexLines.join(''), 'utf8');
  
  console.log('\n\n✅ 全ファイル処理完了:', outDir);
}

processAll().catch(console.error);
