const fs = require('fs');
const path = require('path');
const dir = path.resolve('./docs/copy');
const allFiles = fs.readdirSync(dir);

const searches = {
    '07_要素技術': {
        file: allFiles.find(f => f.includes('要素技術')),
        terms: ['Attention', 'BERT', 'GPT', 'GAN', 'DQN', 'AlphaGo', 'LoRA', 'RAG', 'CBOW', 'VAE', '拡散']
    },
    '09_社会実装': {
        file: allFiles.find(f => f.includes('社会実装')),
        terms: ['MLOps', 'ドリフト', 'A/B', 'シャドウ', 'TPU', '自動運転', 'One-Hot', 'フィーチャー', 'CI/CD', 'カナリア', 'Docker', 'Kubernetes']
    },
    '03_数理①': {
        file: allFiles.find(f => f.includes('①')),
        terms: ['ベイズ', 'Bayes', 'エントロピー', '固有', 'ポアソン', 'KL', '内積']
    },
    '04_数理②': {
        file: allFiles.find(f => f.includes('②')),
        terms: ['勾配', 'Adam', 'MCMC', 'マルコフ', 'DAG', 'p値', '検定', '局所', '鞍点', 'Momentum']
    }
};

const out = [];
Object.entries(searches).forEach(([label, { file, terms }]) => {
    if (!file) { out.push(`${label}: FILE NOT FOUND`); return; }
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    out.push(`\n=== ${label}: ${file} ===`);
    const found = terms.filter(t => text.includes(t));
    const notFound = terms.filter(t => !text.includes(t));
    out.push(`  FOUND: ${found.join(', ')}`);
    out.push(`  NOT_FOUND: ${notFound.join(', ')}`);
    // First 50 meaningful lines
    const lines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.includes('©2024') && !l.includes('FreeStudy') && l.length > 3)
        .slice(0, 50);
    out.push('  CONTENT:');
    lines.forEach(l => out.push('    ' + l.slice(0, 100)));
});

fs.writeFileSync('./tmp_deepdive2.txt', out.join('\n'), 'utf8');
console.log('done');
