const fs = require('fs');
const path = require('path');
const dir = path.resolve('./docs/copy');
const allFiles = fs.readdirSync(dir);

// Read specific files and search for alternative keyword forms
const searches = {
    '07_要素技術': {
        file: allFiles.find(f => f.includes('要素技術')),
        terms: ['トランスフォーマー', 'Attention', 'attention', 'アテンション', 'BERT', 'bert', 'GPT', 'gpt', '強化学習', '生成', '拡散', 'GAN', 'Word2Vec', 'word2vec', 'DQN', 'AlphaGo', 'アルファ碁']
    },
    '09_社会実装': {
        file: allFiles.find(f => f.includes('社会実装')),
        terms: ['MLOps', 'mlops', '機械学習の運用', 'ドリフト', 'A/Bテスト', 'シャドウ', 'TPU', '自動運転', 'One-Hot', 'フィーチャー', 'CI/CD', 'パイプライン', 'カナリア']
    },
    '03_数理①': {
        file: allFiles.find(f => f.includes('数理・統計知識①')),
        terms: ['ベイズ', 'Bayes', 'エントロピー', '正規分布', '固有', 'ポアソン', '二項分布', 'KL']
    },
    '04_数理②': {
        file: allFiles.find(f => f.includes('数理・統計知識②')),
        terms: ['勾配', 'Adam', '最適化', 'MCMC', 'マルコフ', 'DAG', 'p値', '検定', '局所', '鞍点']
    }
};

Object.entries(searches).forEach(([label, { file, terms }]) => {
    if (!file) { console.log(`\n${label}: FILE NOT FOUND`); return; }
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`\n=== ${label}: ${file} (${text.length}chars) ===`);
    terms.forEach(t => {
        if (text.includes(t)) console.log(`  ✅ "${t}"`);
    });
    // Print first 40 content lines
    const lines = text.split('\n').filter(l => l.trim() && !l.includes('©2024') && !l.includes('FreeStudy')).slice(0, 40);
    console.log('  --- First 40 lines ---');
    lines.forEach(l => console.log('  ' + l.trim().slice(0, 100)));
});
