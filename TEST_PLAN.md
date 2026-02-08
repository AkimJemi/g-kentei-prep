# G-Kentei テーブル名変更 テスト計画

## 変更内容
すべてのデータベーステーブル名に `g_kentei_` プレフィックスを追加しました。

### 変更されたテーブル
1. `users` → `g_kentei_users`
2. `attempts` → `g_kentei_attempts`
3. `sessions` → `g_kentei_sessions`
4. `messages` → `g_kentei_messages`
5. `notifications` → `g_kentei_notifications`
6. `submitted_questions` → `g_kentei_submitted_questions`
7. `todos` → `g_kentei_todos`
8. `questions` → `g_kentei_questions`
9. `public_chat` → `g_kentei_public_chat`
10. `categories` → `g_kentei_categories`

## テスト項目

### 1. ユーザー管理機能
- [ ] ユーザー登録
- [ ] ユーザーログイン
- [ ] ユーザー一覧表示
- [ ] ユーザーステータス変更（管理者）

### 2. 問題管理機能
- [ ] 問題一覧取得
- [ ] カテゴリー別問題取得
- [ ] 問題追加（管理者）
- [ ] 問題編集（管理者）
- [ ] 問題削除（管理者）

### 3. カテゴリー管理機能
- [ ] カテゴリー一覧取得
- [ ] カテゴリー追加（管理者）
- [ ] カテゴリー編集（管理者）
- [ ] カテゴリー削除（管理者）

### 4. クイズ機能
- [ ] クイズセッション開始
- [ ] 回答保存
- [ ] セッション継続
- [ ] 結果保存（attempts）
- [ ] 履歴表示

### 5. メッセージ機能
- [ ] お問い合わせ送信
- [ ] メッセージ一覧（管理者）
- [ ] メッセージ返信（管理者）
- [ ] 通知送信

### 6. 通知機能
- [ ] 通知一覧取得
- [ ] 通知既読マーク
- [ ] 通知作成（管理者）

### 7. 問題投稿機能
- [ ] 問題投稿
- [ ] 投稿一覧（管理者）
- [ ] 投稿承認（管理者）
- [ ] 投稿却下（管理者）

### 8. チャット機能
- [ ] チャットメッセージ送信
- [ ] チャット履歴取得
- [ ] メッセージ削除（管理者）

### 9. TODO機能（管理者）
- [ ] TODO一覧取得
- [ ] TODO追加
- [ ] TODO更新
- [ ] TODO削除

### 10. 統計機能
- [ ] 管理者統計取得
- [ ] ユーザー統計取得
- [ ] 診断情報取得

## APIエンドポイントテスト

### 基本動作確認済み
✅ GET /api/categories - カテゴリー一覧取得
✅ GET /api/users - ユーザー一覧取得

### 次のテスト項目
- GET /api/questions
- GET /api/attempts?userId=jemin.kim
- GET /api/sessions?userId=jemin.kim
- GET /api/notifications?userId=jemin.kim
- GET /api/public-chat
- GET /api/admin/stats
- GET /api/admin/todos

## 実行方法

### 1. サーバー起動
```bash
npm run server
```

### 2. フロントエンド起動
```bash
npm run client
```

### 3. 手動テスト
ブラウザで http://localhost:5173 にアクセスし、各機能を確認

### 4. APIテスト（curl）
```bash
# カテゴリー取得
curl http://localhost:3012/api/categories

# ユーザー取得
curl http://localhost:3012/api/users

# 問題取得
curl http://localhost:3012/api/questions

# 統計取得
curl http://localhost:3012/api/admin/stats
```

## 注意事項
- データベースは既存のPostgreSQLを使用
- テーブル名変更により、既存データは新しいテーブル名で自動作成される
- 初回起動時にシードデータが自動投入される
