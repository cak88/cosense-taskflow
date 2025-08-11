# cosense-taskflow Server Version

## 概要
cosense-taskflowのサーバー版は、ScrapboxAPIと直接連携してCORS制限を回避し、自動データ取得機能を提供します。

## 構成
- `app.py`: メインのFlaskアプリケーション
- `proxy.py`: 開発用プロキシサーバー（CORS回避）
- `requirements.txt`: Python依存関係

## セットアップ

### 1. 依存関係のインストール
```bash
pip install -r requirements.txt
```

### 2. 開発環境での実行
```bash
# プロキシサーバーを起動（別ターミナル）
python proxy.py

# 静的ファイルサーバーを起動
python -m http.server 3000
```

### 3. 本番環境での実行
```bash
# Flask開発サーバー
python app.py --host 0.0.0.0 --port 5000

# または Gunicorn で本番運用
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## API エンドポイント

### GET /api/scrapbox/projects/{project_name}/pages
Scrapboxプロジェクトのページ一覧を取得

**レスポンス:**
```json
{
  "pages": [
    {
      "id": "page_id",
      "title": "ページタイトル",
      "updated": 1234567890,
      "lines": ["タイトル", "本文..."]
    }
  ],
  "projectName": "project_name",
  "fetchedAt": 1234567890
}
```

### GET /api/scrapbox/projects/{project_name}/info
Scrapboxプロジェクトの基本情報を取得

### GET /api/health
ヘルスチェック

## 環境変数
特に設定は不要ですが、以下の環境変数で設定を変更できます：

- `FLASK_ENV`: development | production
- `FLASK_DEBUG`: True | False

## 注意事項
- Scrapbox APIへの直接アクセスのため、レート制限に注意
- 本番環境では適切なリバースプロキシ（nginx等）の使用を推奨
- HTTPS化を推奨