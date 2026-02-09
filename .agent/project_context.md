# G検定対策学習プラットフォーム - プロジェクトコンテキスト

## プロジェクト概要
**プロジェクト名**: G検定対策学習プラットフォーム (G-Kentei Prep)  
**ターゲット資格**: G検定（ジェネラリスト検定）  
**目的**: AI・機械学習の基礎知識を効率的に学習できる次世代学習プラットフォーム

## 技術スタック

### フロントエンド
- **Framework**: React 18 (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animation**: Framer Motion
- **UI Theme**: Neural Link（Glassmorphism、ダークモード）

### バックエンド
- **Database**: PostgreSQL (Render)
- **ORM/Query**: Prisma
- **API**: Next.js API Routes
- **Cache**: Dexie.js (ブラウザキャッシュ)

### デプロイ
- **Platform**: Vercel / Netlify
- **Database Host**: Render
- **Version Control**: Git/GitHub

## データベース接続情報
```
Internal Database URL:
postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a/g_kentei_prep_app_db

External Database URL:
postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db
```

## アーキテクチャパターン

### デザインシステム
- **配色**: Slate-950ベース、Cyan-400/Indigo-500アクセント
- **視覚効果**: WebGL Neural Background、Glassmorphism、発光エフェクト
- **タイポグラフィ**: Black Italic Uppercase（英語サブタイトル）

### モバイル最適化
- **分野選択**: 2カラムグリッドレイアウト
- **ナビゲーション**: ボトムナビゲーション
- **タッチターゲット**: 適切なサイズ確保

## 主要機能

### 1. 学習エンジン
- 4択クイズシステム
- キーボードショートカット（1-4選択、Enter次へ、Esc終了）
- 即時解説（Root Analysis）
- TTS読み上げ機能
- プログレス管理・タイマー

### 2. 学習モード
- 分野別学習（カテゴリ別問題演習）
- フラッシュカード（暗記カード）
- ランダムシャッフル

### 3. データ分析
- ダッシュボード（総学習数、平均正答率）
- 詳細統計（分野別正答率チャート）
- 学習履歴（Neural Logs）

### 4. コミュニティ機能
- 問題投稿（Logic Submission）
- 通知システム
- お問い合わせフォーム

### 5. 管理者機能
- ユーザー管理
- メッセージ管理
- 投稿承認システム
- 問題・カテゴリ管理
- 通知配信
- タスク管理（Admin TODO）

## バージョン管理
- **現在のバージョン**: v1.0.0_STABLE
- **バージョニング**: セマンティックバージョニング
- **表示場所**: App.tsxフッター

## 開発ワークフロー
1. 機能実装
2. 細かいコミット（日本語+英語メッセージ）
3. ビルド検証
4. デプロイ

## 品質基準
- モバイルUX最優先
- 未来的でプレミアムなデザイン
- 高速なレスポンス
- アクセシビリティ対応
