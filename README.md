# G-Kentei Prep (G検定対策アプリ)

G検定（ジェネラリスト検定）の学習を支援するためのWebアプリケーションです。
模擬試験、学習履歴の記録、統計データによる進捗管理機能を備えています。

## ✨ 主な機能

- **模擬試験 (Quiz Mode)**: 実際の試験形式に近い問題演習ができます。([E]キーで開始)
- **学習履歴 (History)**: 過去の受験結果を記録し、正答率や苦手分野を分析します。
- **統計ダッシュボード (Dashboard)**: 日々の学習進捗をグラフで可視化します。([Q]キーで確認)
- **弱点克服 (Weakness Protocol)**: 間違えた問題だけを抽出し、重点的に復習できます。([W]キーで開始)
- **コミュニティ (Community Chat)**: 学習者同士で情報交換や励まし合いができるリアルタイムチャット。
- **管理者機能 (Admin Dashboard)**: ユーザー管理、お知らせ配信、問題データの編集が可能です。
- **AIデータベース (Neural DB)**: 
  - SQLiteを使用した堅牢なデータ保存
  - ユーザーごとの学習セッション管理

## 📜 更新履歴 (Changelog)

### v1.2.0 (2026-02-08)
- **Community Chatの実装**: リアルタイムでメッセージを交換できるグループチャット機能を追加。
- **Dashboardの強化**:
  - レイアウトを一新し、チャットとアクションカードへのアクセスを改善。
  - ショートカットキー (`E`, `Q`, `W`) と機能ガイドを追加。
- **学習機能の拡張**:
  - 「弱点克服モード」で苦手な問題を効率的に復習可能に。
  - 「学習再開」機能で中断したセッションからスムーズに再開。
- **管理者機能の刷新**: ユーザー管理、メッセージ送信、問題管理UIを改善。
- **システム改善**:
  - ユーザーIDベースのデータ管理へ移行し、整合性を向上。
  - レンダリングパフォーマンスの最適化。

## 🛠 技術スタック

- **Frontend**: React (v19), TailwindCSS, Framer Motion
- **Backend**: Node.js, Express (v5)
- **Database**: SQLite (better-sqlite3)
- **Deploy**: Render.com (Blueprint対応)

## 🚀 ローカルでの実行方法

### 1. リポジトリのクローン
```bash
git clone https://github.com/AkimJemi/g-kentei-prep.git
cd g-kentei-prep
```

### 2. ライブラリのインストール
```bash
npm install
```

### 3. アプリケーションの起動
```bash
npm run dev
```
ブラウザで [http://localhost:5173](http://localhost:5173) にアクセスしてください。

## 📦 デプロイ (Render.com)

このプロジェクトには `render.yaml` が含まれており、**Render Blueprint** 機能を使って簡単にデプロイできます。

1. Render.com で **New +** > **Blueprint** を選択
2. リポジトリを連携
3. 自動設定を確認して **Apply** をクリック

## 📂 ディレクトリ構成

```
g-kentei-prep/
├── src/            # フロントエンドのソースコード
├── server/         # バックエンドAPIサーバー (Express)
├── render.yaml     # Render.com デプロイ設定
└── package.json    # プロジェクト設定
```

## 📝 ライセンス

MIT License
