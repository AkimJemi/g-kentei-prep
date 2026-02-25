import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '../docs/資料');
const outDir  = path.join(__dirname, '../docs/study_notes');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// フォルダ内のPDFを自動検出して処理
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
    const title = file.replace(/\.pdf$/i, '').replace(/[+]+$/, '').trim();
    return { file, title, domain };
  })
  .sort((a, b) => a.domain.localeCompare(b.domain));

console.log(`[Found] ${PDF_FILES.length} PDFs to process`);
PDF_FILES.forEach(f => console.log(`  ${f.domain} <- ${f.file}`));
console.log();

function cleanText(raw) {
  return raw
    .replace(/©\d{4}[^\n]*/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function textToMarkdown(title, domain, text, pages) {
  const lines = text.split('\n');
  const sections = [];
  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isHeading =
      trimmed.length <= 45 &&
      !trimmed.match(/[。、：…]/) &&
      !trimmed.match(/^[・‧•▶→\-]/) &&
      !trimmed.match(/^\d+[.)]\s/) &&
      trimmed.match(/[ぁ-んァ-ンー一-龯A-Za-z]/);

    if (isHeading) {
      if (currentSection !== null) {
        sections.push({ heading: currentSection, content: currentContent.join('\n') });
      }
      currentSection = trimmed;
      currentContent = [];
    } else {
      const bulletLine = trimmed
        .replace(/^[・‧•▶→]\s*/, '- ')
        .replace(/^(\d+)[.)]\s+/, '$1. ');
      currentContent.push(bulletLine);
    }
  }
  if (currentSection) {
    sections.push({ heading: currentSection, content: currentContent.join('\n') });
  }

  const date = new Date().toISOString().split('T')[0];
  const label = domain.replace(/^\d+_/, '');

  let md = `# ${title}\n\n`;
  md += `> **G検定対策 勉強ノート** | 分野：${label} | 総ページ数：${pages}P | 作成：${date}\n\n`;
  md += `---\n\n`;

  if (sections.length > 0) {
    md += `## 📋 目次\n\n`;
    sections.slice(0, 50).forEach((s, i) => {
      md += `${i + 1}. ${s.heading}\n`;
    });
    md += `\n---\n\n`;
  }

  sections.forEach((s) => {
    md += `## ${s.heading}\n\n`;
    if (s.content.trim()) {
      md += s.content.trim() + '\n\n';
    }
    md += `---\n\n`;
  });

  return md;
}

async function processAll() {
  const date = new Date().toISOString().split('T')[0];
  const indexLines = [
    `# G検定 資格対策 勉強ノート INDEX\n\n`,
    `> 生成日：${date}　|　PDFソース：docs/資料\n\n`,
    `---\n\n`,
    `| # | 分野 | ページ数 |\n`,
    `|---|------|----------|\n`,
  ];

  for (const item of PDF_FILES) {
    const pdfPath = path.join(docsDir, item.file);
    if (!fs.existsSync(pdfPath)) {
      console.warn(`[SKIP] Not found: ${item.file}`);
      continue;
    }

    process.stdout.write(`[Processing] ${item.domain} ...`);
    try {
      const buf = fs.readFileSync(pdfPath);
      const data = await pdfParse(buf);
      const cleaned = cleanText(data.text);
      const md = textToMarkdown(item.title, item.domain, cleaned, data.numpages);

      const outPath = path.join(outDir, `${item.domain}.md`);
      fs.writeFileSync(outPath, md, 'utf8');
      const wordCount = md.replace(/[^\S\n]/g, '').length;
      console.log(` ✓ (${data.numpages}P, ${wordCount}文字)`);
      indexLines.push(`| ${item.domain.split('_')[0]} | [${item.title}](./${item.domain}.md) | ${data.numpages}P |\n`);
    } catch (e) {
      console.error(` ERROR: ${e.message}`);
    }
  }

  indexLines.push(`\n---\n\n_このファイルは generate_study_notes.js により自動生成されました_\n`);
  fs.writeFileSync(path.join(outDir, 'INDEX.md'), indexLines.join(''), 'utf8');
  console.log('\n✅ 全ノート生成完了:', outDir);
}

processAll().catch(console.error);
