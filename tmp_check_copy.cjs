const fs = require('fs');
const path = require('path');
const dir = './docs/copy';

// Keywords to check for each file
const checkKeywords = {
    '人工知能とは.txt': ['ダートマス', 'マッカーシー', 'チューリング', 'サール', 'カーツワイル', 'シンギュラリティ', 'フレーム問題', '組み合わせ爆発', 'CVPR', 'NeurIPS', '機械翻訳'],
    '人工知能をめぐる動向.txt': ['Mini-Max', 'αβ', '幅優先', '深さ優先', 'オントロジー', 'Cyc', 'ワトソン', 'セマンティック', 'みにくいアヒル', 'ILSVRC', 'ヒントン'],
    'AIに必要な数理・統計知識①+.txt': ['ベイズ', '正規分布', 'エントロピー', 'KLダイバージェンス', '固有値'],
    'AIに必要な数理・統計知識②.txt': ['勾配降下法', 'Adam', 'SGD', 'MCMC', 'DAG', '帰無仮説', 'p値'],
    'ディープラーニングの概要.txt': ['ReLU', 'バッチ正規化', 'ドロップアウト', 'LSTM', 'GRU', '誤差逆伝播'],
    'ディープラーニングの要素技術.txt': ['Transformer', 'BERT', 'GPT', 'RLHF', 'RAG', 'LoRA', 'GAN', '拡散モデル'],
    'ディープラーニングの応用例.txt': ['ResNet', 'YOLO', 'CLIP', 'Pix2Pix', 'Cycle GAN', '基盤モデル', 'SHAP', 'LIME', '蒸留', '量子化', '宝くじ'],
    'ディープラーニングの社会実装に向けて.txt': ['MLOps', 'データドリフト', 'A/Bテスト', 'シャドウ', 'TPU', 'SAEレベル', 'One-Hot', '正規化', 'フィーチャーストア'],
    'AI倫理・AIガバナンス.txt': ['EU AI Act', 'ハードロー', 'ソフトロー', 'FAT', 'ELSI', 'プライバシー・バイ・デザイン', 'OECD', 'バイアス', 'センシティブ'],
    'AIに関する法律と契約.txt': ['著作権', '著作人格権', 'GDPR', '忘れられる権利', '営業秘密', '30条の4', '個人情報', '要配慮']
};

const files = fs.readdirSync(dir);
const results = {};

files.forEach(fname => {
    const fpath = path.join(dir, fname);
    const content = fs.readFileSync(fpath, 'utf8');
    const keywords = checkKeywords[fname] || [];
    results[fname] = {
        size: content.length,
        found: keywords.filter(kw => content.includes(kw)),
        missing: keywords.filter(kw => !content.includes(kw))
    };
});

console.log(JSON.stringify(results, null, 2));
