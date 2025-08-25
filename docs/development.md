# 開発者ガイド

## ローカル開発

### 基本セットアップ

1. プロジェクトディレクトリでローカルWebサーバーを起動：
   ```bash
   python -m http.server 3000
   ```

2. Cosense API連携のためにプロキシサーバーも起動：
   ```bash
   cd server
   python proxy.py
   ```

### ファイル構造

```
├── index.html          # メインアプリケーション
├── css/
│   └── styles.css     # アプリケーションスタイル
├── js/
│   ├── main.js        # アプリケーション初期化
│   ├── config.js      # 設定
│   ├── data.js        # データ処理
│   ├── ui.js          # UI描画
│   ├── filters.js     # フィルタリング＆ソート
│   ├── export.js      # エクスポート機能
│   ├── settings.js    # 設定管理
│   ├── merge-manager.js # 競合解決
│   └── scrapbox-api.js # Cosense API連携
├── server/
│   ├── proxy.py       # ローカル開発用CORSプロキシ
│   └── app.py         # デプロイ用Flaskサーバー
├── docs/              # ドキュメント
└── data/
    └── sample.json    # テスト用サンプルデータ
```

## 主要コンポーネント

### データフロー

1. **データ取得**: `scrapbox-api.js` がCosenseからデータを取得
2. **データ処理**: `data.js` がタスク情報をパースして構造化
3. **変更管理**: `merge-manager.js` が変更履歴と競合を管理
4. **UI更新**: `ui.js` が画面を描画・更新
5. **エクスポート**: `export.js` が変更をCosense形式で出力

### キー機能の実装

#### 2段階同期システム
- 新バックアップがある場合: フル同期
- ない場合: 変更されたページのみ個別取得（`fetchIndividualPagesAndMerge`）

#### 競合解決
- `MergeManager`クラスが変更履歴を管理
- 自動的にTaskflow側の変更を優先
- Cosense側の追加情報は保持

#### データ永続化
- エクスポート成功後に`originalJson`とキャッシュを自動更新
- ページリロード後も変更が保持される

## ブラウザ対応

- ES6+サポートのモダンブラウザ
- Chrome、Firefox、Safari、Edge（最新版）
- iOS・Androidのモバイルブラウザ

## 貢献

プルリクエストやイシューの報告を歓迎します。大きな変更を行う前に、まずイシューで議論していただければと思います。