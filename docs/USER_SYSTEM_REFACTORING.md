# G-Kentei Prep - ユーザーシステム大規模改修

## 📋 実装完了内容

### データベーススキーマ変更
- **usersテーブル**: `id`カラムを削除、`userId`を主キーに変更
- **userId**: TEXT型、英字のみ、ログインID
- **nickname**: TEXT型、英数字、表示名
- **外部キー**: attempts, sessions, messages, notificationsテーブルのuserIdカラムをTEXT型に変更

### バックエンドAPI更新
- ユーザー作成・取得エンドポイントを更新
- バリデーション追加（userId: 英字のみ、nickname: 英数字のみ）
- JOINクエリをuserId基準に更新

### フロントエンド更新
- User型定義を更新（userId, nickname）
- useAuthStoreのsignup関数シグネチャ更新（3パラメータ）
- LoginViewにニックネーム入力フィールド追加
- 全コンポーネントでcurrentUser.id → currentUser.userIdに変更
- 全コンポーネントでcurrentUser.username → currentUser.nicknameに変更

### 残りの作業
- AdminDashboard.tsxの修正（user.id → user.userId, user.username → user.nickname）
- QuizView.tsxなど他のコンポーネントの確認

## 🔍 影響を受けたファイル
- server/index.js
- src/db/db.ts
- src/store/useAuthStore.ts
- src/components/LoginView.tsx
- src/App.tsx
- src/components/NotificationView.tsx
- src/components/Dashboard.tsx
- src/components/HistoryView.tsx
- src/components/Statistics.tsx
- src/components/AdminDashboard.tsx（進行中）
