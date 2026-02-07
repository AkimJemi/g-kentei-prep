# G-Kentei Prep デプロイ手順

## 準備完了 ✅

以下のファイルが作成・更新されました:
- ✅ `server/index.js` - 環境変数PORTに対応、静的ファイル配信追加
- ✅ `package.json` - `start`スクリプト追加
- ✅ `render.yaml` - Render.com設定ファイル

## デプロイ手順

### 方法1: Render.com（推奨）

#### ステップ1: GitHubリポジトリ作成
```bash
# プロジェクトディレクトリで実行
git init
git add .
git commit -m "Ready for deployment"

# GitHubで新しいリポジトリを作成後
git remote add origin https://github.com/YOUR_USERNAME/g-kentei-prep.git
git branch -M main
git push -u origin main
```

#### ステップ2: Render.comでデプロイ
1. [Render.com](https://render.com)にアクセスしてサインアップ
2. 「New +」→「Web Service」を選択
3. GitHubリポジトリを接続
4. 以下の設定を確認（render.yamlから自動設定されます）:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. 「Create Web Service」をクリック

#### ステップ3: デプロイ完了
- 数分後、`https://g-kentei-prep.onrender.com`のようなURLでアクセス可能になります
- 初回起動時は少し時間がかかる場合があります

### 方法2: ローカルビルドテスト

デプロイ前にローカルでテストする場合:

```bash
# ビルド
npm run build

# プロダクションモードで起動
npm start

# ブラウザで http://localhost:3011 にアクセス
```

## 注意事項

### ⚠️ データベースの永続化
Render.comの無料プランでは、サービスが非アクティブになると停止し、再起動時にSQLiteデータベースがリセットされる可能性があります。

**解決策**:
1. **Render Disk**を使用（月$1〜）
2. **PostgreSQL**に移行（Renderの無料PostgreSQLあり）

### 環境変数
Renderダッシュボードで以下を設定可能:
- `NODE_ENV`: `production`（自動設定済み）
- `PORT`: Renderが自動設定

## トラブルシューティング

### ビルドエラー
```bash
# ローカルでビルドテスト
npm run build
```

### ポートエラー
`server/index.js`が`process.env.PORT`を使用していることを確認済み

### CORS エラー
現在のCORS設定は全てのオリジンを許可しています。本番環境では制限を推奨:
```javascript
app.use(cors({
  origin: 'https://your-domain.onrender.com'
}));
```

## 次のステップ

1. GitHubにプッシュ
2. Render.comでデプロイ
3. デプロイ完了後、URLにアクセスしてテスト
4. 必要に応じてデータベースを PostgreSQL に移行

## サポート

デプロイに関する質問があれば、Renderの[ドキュメント](https://render.com/docs)を参照してください。
