# G-Kentei Prep (G検定対策アプリ)

G検定（ジェネラリスト検定）の学習を支援するための次世代Webアプリケーションです。
最新のUIデザインとPostgreSQLによる堅牢なバックエンドを統合し、シームレスな学習体験を提供します。

## ✨ 主な機能

- **模擬試験 (Quiz Mode)**: 実際の試験形式に近い問題演習ができます。([E]キーで開始)
- **学習履歴 (History)**: 過去の受験結果を記録し、正答率や苦手分野を分析します。
- **統計ダッシュボード (Dashboard)**: 日々の学習進捗をグラフで可視化します。([Q]キーで確認)
- **弱点克服 (Weakness Protocol)**: 間違えた問題だけを抽出し、重点的に復習できます。([W]キーで開始)
- **コミュニティ・チャット (Neural Chat)**: ニックネームとアバターによる、学習者同士のリアルタイム交流。
- **管理者機能 (Admin Portal)**: ユーザー・問題・投稿・通知の包括的な管理システム。
- **データ正規化エンジン**: DB（Postgres）とFE（camelCase）のデータの整合性を自動保証。

## 📜 更新履歴 (Changelog)

### v4.1.0 (2026-02-08)
- **PostgreSQLへの完全移行**: SQLiteからPostgreSQLへの移行を完了。
- **システム安定性の向上**: 
  - `normalizeKeys` ユーティリティの導入による、DBカラムとフロントエンドプロパティの不一致を自動解決。
  - セッション再開機能と、ログインループ問題の修正。
- **UI/UXの刷新**:
  - **Neural Chat v2**: 背景の視認性向上、ユーザーアバターの導入、メッセージの「パージ」機能。
  - **ナビゲーション**: ログイン後やホーム遷移時の自動トップスクロールの実装。
  - **削除プロトコル**: 誤操作防止のための確認アラートの強化（AIをテーマにしたメッセージ形式）。
- **管理者機能の強化**: ユーザー・問題削除時の安全性の向上。

### v4.0.0 (2026-02-07)
- **UIデザインのオーバーホール**: Glassmorphismと微細なアニメーションを採用したプレミアムなデザイン。
- **キーボード・ショートカット**: 全画面でのクイックアクセスに対応。

## 🛠 技術スタック

- **Frontend**: React (v19), Vite, Framer Motion, Lucide React, Zustand
- **Backend**: Node.js, Express (v5)
- **Database**: PostgreSQL (pg)
- **Utility**: `normalizeKeys` (Case normalization & Date/JSON parsing)
- **Deploy**: Render.com (PostgreSQL Cluster & Blueprint)

## 🚀 ローカルでの実行方法

### 1. リポジトリのクローン
```bash
git clone https://github.com/AkimJemi/g-kentei-prep.git
cd g-kentei-prep
```

### 2. 環境変数の設定
PostgreSQLの接続情報を設定してください（DATABASE_URL）。

### 3. インストール・起動
```bash
npm install
npm run dev
```
ブラウザで [http://localhost:5173](http://localhost:5173) にアクセスしてください。

## 📂 ディレクトリ構成

```
g-kentei-prep/
├── src/            # フロントエンド (React/TypeScript)
│   ├── db/         # DBアクセスレイヤー
│   ├── store/      # 状態管理 (Zustand)
│   └── utils/      # 正規化等の共通ユーティリティ
├── server/         # バックエンドAPI (Express)
├── render.yaml     # デプロイ設定
└── package.json    # プロジェクト定義
```

## 📝 ライセンス

MIT License
