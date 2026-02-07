# お問い合わせ・通知システム

## 📧 機能概要

G-Kentei Prepアプリケーションには、ユーザーと管理者間のコミュニケーションを円滑にする完全な通知システムが実装されています。

## ✨ 実装済み機能

### 1. お問い合わせ送信（ユーザー側）

**場所**: ヘッダーの「お問い合わせ」ボタン → ContactView

**機能**:
- ログイン中のユーザーは自動的にユーザーIDが送信される
- 以下の情報が管理者に送信されます：
  - お名前
  - メールアドレス（任意）
  - 件名（一般的なお問い合わせ、不具合報告、機能提案など）
  - お問い合わせ内容
  - **ユーザーID（自動）**

**実装コード** (`ContactView.tsx` 33行目):
```typescript
body: JSON.stringify({ ...formData, userId: currentUser?.id })
```

### 2. 受信トレイ（管理者側）

**場所**: 管理画面 → 「受信トレイ」タブ

**表示情報**:
- 件名
- **ユーザーID**（ログインユーザーの場合）または「ゲスト」表示
- 送信者名とメールアドレス
- お問い合わせ内容
- 受信日時
- 返信状態（未読/返信済み）

**実装コード** (`AdminDashboard.tsx` 663-667行目):
```tsx
{(msg.userId !== null && msg.userId !== undefined) ? (
    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">
        ユーザーID: {msg.userId}
    </span>
) : (
    <span className="text-[10px] bg-slate-900/50 text-slate-600 px-2 py-0.5 rounded border border-white/5 font-mono italic">
        ゲスト
    </span>
)}
```

### 3. 管理者返信機能

**場所**: 管理画面 → 受信トレイ → 各メッセージの「返信する」ボタン

**機能**:
- 管理者がメッセージに返信すると、以下の処理が自動実行されます：
  1. メッセージのステータスが「返信済み」に更新
  2. 返信内容がメッセージに保存
  3. **ユーザーIDが存在する場合、そのユーザーに通知が自動送信される**

**実装コード** (`server/index.js` 358-364行目):
```javascript
// Create notification for the user if userId exists
if (msg.userId) {
    db.prepare(`
        INSERT INTO notifications (userId, title, content, type) 
        VALUES (?, ?, ?, ?)
    `).run(msg.userId, 'お問い合わせへの回答', `「${msg.topic}」についての回答が届きました: ${reply}`, 'info');
}
```

### 4. 通知受信（ユーザー側）

**場所**: 
- ヘッダーの通知ベルアイコン（未読数バッジ付き）
- 通知画面（ベルアイコンクリック）

**機能**:
- ログイン中のユーザーは自分宛ての通知のみ表示される
- 管理者からの返信通知を受け取れる
- 未読通知は青いアクセントラインで強調表示
- 「既読にする」ボタンで既読管理
- 未読の重要通知（警告・エラー）は自動的にトースト通知

**実装コード**:

`App.tsx` (35-37行目):
```typescript
// Fetch notifications for the current user
const notifUrl = currentUser ? `/api/notifications?userId=${currentUser.id}` : '/api/notifications';
const res = await fetch(notifUrl);
```

`NotificationView.tsx` (24-25行目):
```typescript
const url = currentUser ? `/api/notifications?userId=${currentUser.id}` : '/api/notifications';
const res = await fetch(url);
```

### 5. 未読メッセージ数表示（管理者向け）

**場所**: ヘッダーの「お問い合わせ」ボタン

**機能**:
- 管理者がログインしている場合、未読メッセージ数がバッジで表示される
- 60秒ごとに自動更新
- リアルタイムで未読数を把握できる

**実装コード** (`Layout.tsx` 31-35行目):
```tsx
{unreadMessages > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg shadow-red-500/50">
        {unreadMessages}
    </span>
)}
```

## 🔄 データフロー

```
1. ユーザーがお問い合わせ送信
   ↓
2. データベースにメッセージ保存（userIdを含む）
   ↓
3. 管理者が受信トレイで確認（userIdが表示される）
   ↓
4. 管理者が返信
   ↓
5. 返信内容がメッセージに保存 + ユーザーに通知作成
   ↓
6. ユーザーがログイン時に通知を受信
   ↓
7. 通知画面で返信内容を確認
```

## 📊 データベーススキーマ

### messages テーブル
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,              -- ログインユーザーのID（ゲストの場合はNULL）
    name TEXT,                   -- 送信者名
    email TEXT,                  -- メールアドレス
    topic TEXT,                  -- 件名
    message TEXT,                -- お問い合わせ内容
    reply TEXT,                  -- 管理者の返信
    repliedAt DATETIME,          -- 返信日時
    status TEXT DEFAULT 'unread', -- 'unread' または 'replied'
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### notifications テーブル
```sql
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,              -- 通知対象ユーザーID（NULLの場合は全体通知）
    title TEXT,                  -- 通知タイトル
    content TEXT,                -- 通知内容
    type TEXT DEFAULT 'info',    -- 'info', 'success', 'warning', 'error'
    isRead INTEGER DEFAULT 0,    -- 既読フラグ（0: 未読, 1: 既読）
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🎯 使用例

### ユーザー視点
1. お問い合わせボタンをクリック
2. フォームに必要事項を入力して送信
3. 管理者からの返信を待つ
4. 通知ベルアイコンに未読バッジが表示される
5. 通知画面で返信内容を確認

### 管理者視点
1. ヘッダーのお問い合わせボタンに未読数バッジが表示される
2. 管理画面の「受信トレイ」タブを開く
3. メッセージを確認（ユーザーIDが表示される）
4. 「返信する」ボタンをクリック
5. 返信内容を入力して送信
6. 自動的にユーザーに通知が送信される

## ✅ 実装完了チェックリスト

- [x] お問い合わせ時にuserIdを自動送信
- [x] 受信トレイでuserIdを表示
- [x] 管理者返信時に自動通知作成
- [x] ユーザー別通知フィルタリング
- [x] 未読メッセージ数のバッジ表示
- [x] 通知の既読管理
- [x] リアルタイム更新（60秒間隔）
- [x] エラーハンドリングとデバッグログ

## 🚀 今後の拡張可能性

- メール通知の追加
- プッシュ通知の実装
- 返信のスレッド表示
- 添付ファイル対応
- 通知のカテゴリ分け
