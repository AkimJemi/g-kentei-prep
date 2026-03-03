const fs = require('fs');
const path = require('path');
const dir = path.resolve('./docs/copy');

// List actual filenames from directory
const allFiles = fs.readdirSync(dir);
console.log('Files found:', allFiles);

// Map chapter to partial filename match
const filePatterns = {
    '01': '人工知能とは',
    '02': '人工知能をめぐる動向',
    '03': '数理・統計知識①',
    '04': '数理・統計知識②',
    '06': 'ディープラーニングの概要',
    '07': 'ディープラーニングの要素技術',
    '08': 'ディープラーニングの応用例',
    '09': 'ディープラーニングの社会実装',
    '10': 'AI倫理',
    '11': '法律と契約',
};

const checks = {
    '01': ['ダートマス', 'マッカーシー', 'チューリング', '中国語の部屋', 'カーツワイル', 'シンギュラリティ', 'フレーム問題', '組み合わせ爆発', 'CVPR', 'NeurIPS', '機械翻訳', 'GNMT', 'AI効果'],
    '02': ['Mini-Max', 'αβ', '幅優先', '深さ優先', 'オントロジー', 'Cyc', 'ワトソン', 'セマンティック', 'みにくいアヒル', 'ILSVRC', 'ヒントン', 'is-a', 'part-of', 'LOD'],
    '03': ['ベイズ', '正規分布', 'エントロピー', 'KLダイバージェンス', '固有値', 'ベルヌーイ', 'ポアソン', '内積'],
    '04': ['勾配降下法', 'Adam', 'SGD', 'MCMC', 'DAG', '帰無仮説', 'p値', '有意水準', '第1種', '局所最適', '鞍点', 'Momentum', 'AdaGrad', 'RMSprop'],
    '06': ['ReLU', 'バッチ正規化', 'ドロップアウト', 'LSTM', 'GRU', '誤差逆伝播', 'シグモイド', 'ソフトマックス', '畳み込み', 'プーリング'],
    '07': ['Transformer', 'BERT', 'GPT', 'RLHF', 'GAN', '拡散モデル', 'Word2Vec', 'CBOW', 'Skip-gram', 'DQN', 'AlphaGo', 'VAE', 'LoRA', 'RAG'],
    '08': ['ResNet', 'YOLO', 'CLIP', 'Pix2Pix', 'Cycle GAN', '基盤モデル', 'SHAP', 'LIME', '蒸留', '量子化', '宝くじ', 'VGG', 'Grad-CAM', 'プルーニング', 'NeRF', 'Zero Shot'],
    '09': ['MLOps', 'データドリフト', 'A/Bテスト', 'シャドウ', 'TPU', 'SAEレベル', 'One-Hot', 'フィーチャーストア', 'CI/CD', 'カナリア'],
    '10': ['EU AI Act', 'ハードロー', 'ソフトロー', 'FAT', 'ELSI', 'プライバシー・バイ・デザイン', 'OECD', 'バイアス', 'LAWS', 'クライシス'],
    '11': ['著作権', '著作人格権', 'GDPR', '忘れられる権利', '営業秘密', '30条の4', '個人情報', '要配慮', '匿名加工', '仮名加工', 'DPO', '特許', '意匠'],
};

Object.entries(filePatterns).forEach(([ch, pattern]) => {
    const fname = allFiles.find(f => f.includes(pattern));
    if (!fname) { console.log(`Chapter ${ch}: file not found for pattern "${pattern}"`); return; }
    const text = fs.readFileSync(path.join(dir, fname), 'utf8');
    const kws = checks[ch] || [];
    const found = kws.filter(k => text.includes(k));
    const missing = kws.filter(k => !text.includes(k));
    console.log(`\n=== Ch${ch}: ${fname} (${text.length} chars) ===`);
    console.log(`  ✅ Found: ${found.join(', ')}`);
    if (missing.length > 0) console.log(`  ❌ NOT in PDF: ${missing.join(', ')}`);
});
