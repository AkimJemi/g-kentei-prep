const fs = require('fs');
const path = require('path');
const dir = path.resolve('./docs/copy');

// Read each file
const read = fname => fs.readFileSync(path.join(dir, fname), 'utf8');

// Check if keyword exists in file
const has = (text, kw) => text.includes(kw);

// Map files to chapters
const fileMap = {
    '01': '人工知能とは.txt',
    '02': '人工知能をめぐる動向.txt',
    '03': 'AIに必要な数理・統計知識①+.txt',
    '04': 'AIに必要な数理・統計知識②.txt',
    '06': 'ディープラーニングの概要.txt',
    '07': 'ディープラーニングの要素技術.txt',
    '08': 'ディープラーニングの応用例.txt',
    '09': 'ディープラーニングの社会実装に向けて.txt',
    '10': 'AI倫理・AIガバナンス.txt',
    '11': 'AIに関する法律と契約.txt',
};

// Keywords to verify per chapter
const checks = {
    '01': ['ダートマス', 'マッカーシー', 'チューリング', '中国語の部屋', 'カーツワイル', 'シンギュラリティ', 'フレーム問題', '組み合わせ爆発', 'CVPR', 'NeurIPS', '機械翻訳', 'GNMT', 'AI効果', 'トイプロブレム', '記号接地'],
    '02': ['Mini-Max', 'αβ', '幅優先', '深さ優先', 'オントロジー', 'Cyc', 'ワトソン', 'セマンティック', 'みにくいアヒル', 'ILSVRC', 'ヒントン', 'アーサー', 'is-a', 'part-of', 'LOD'],
    '03': ['ベイズ', '正規分布', 'エントロピー', 'KLダイバージェンス', '固有値', 'ベルヌーイ', 'ポアソン', 'JSダイバージェンス', '内積'],
    '04': ['勾配降下法', 'Adam', 'SGD', 'MCMC', 'DAG', '帰無仮説', 'p値', '有意水準', '第1種', '局所最適', '鞍点', 'Momentum', 'AdaGrad', 'RMSprop'],
    '06': ['ReLU', 'バッチ正規化', 'ドロップアウト', 'LSTM', 'GRU', '誤差逆伝播', 'シグモイド', 'ソフトマックス', '畳み込み', 'プーリング', 'パーセプトロン'],
    '07': ['Transformer', 'BERT', 'GPT', 'RLHF', 'GAN', '拡散モデル', 'Word2Vec', 'CBOW', 'Skip-gram', 'DQN', 'AlphaGo', 'VAE', 'LoRA', 'RAG'],
    '08': ['ResNet', 'YOLO', 'CLIP', 'Pix2Pix', 'Cycle GAN', '基盤モデル', 'SHAP', 'LIME', '蒸留', '量子化', '宝くじ', 'VGG', 'GoogLeNet', 'Grad-CAM', 'プルーニング', 'NeRF', 'Zero Shot'],
    '09': ['MLOps', 'データドリフト', 'A/Bテスト', 'シャドウ', 'TPU', 'SAEレベル', 'One-Hot', 'フィーチャーストア', 'CI/CD', 'コンテナ', 'Docker', 'Kubernetes', 'カナリア'],
    '10': ['EU AI Act', 'ハードロー', 'ソフトロー', 'FAT', 'ELSI', 'プライバシー・バイ・デザイン', 'OECD', 'バイアス', 'センシティブ', 'LAWS', 'Tay', 'クライシス'],
    '11': ['著作権', '著作人格権', 'GDPR', '忘れられる権利', '営業秘密', '30条の4', '個人情報', '要配慮', 'GDPR', '匿名加工', '仮名加工', 'DPO', '特許', '意匠'],
};

const results = {};
Object.entries(fileMap).forEach(([ch, fname]) => {
    const text = read(fname);
    const kws = checks[ch] || [];
    results[ch] = {
        file: fname,
        total_chars: text.length,
        found: kws.filter(k => has(text, k)),
        missing: kws.filter(k => !has(text, k)),
    };
});

// Print results
Object.entries(results).forEach(([ch, r]) => {
    console.log(`\n=== Chapter ${ch}: ${r.file} (${r.total_chars} chars) ===`);
    console.log(`  ✅ Found (${r.found.length}): ${r.found.join(', ')}`);
    if (r.missing.length > 0)
        console.log(`  ❌ Missing from PDF (${r.missing.length}): ${r.missing.join(', ')}`);
});
