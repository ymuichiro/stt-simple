# Auto-Dev

OpenCodeを使用した継続的開発自動化システム。

## 概要

このシステムは以下のループを自動的に繰り返します：

1. `ISSUES.md` と `FEATURES.md` からタスクを読み込む
2. 優先度に基づいてタスクをランダムに選択
3. OpenCode (SDK) を使用してタスクを実装
4. 変更をコミット＆プッシュ
5. タスクを完了としてマーク
6. 次のタスクへ

## 使用方法

### 継続ループ（推奨）

```bash
./auto-dev.sh
```

### 単一タスクのみ実行

```bash
./auto-dev.sh --once
```

### ステータス確認

```bash
./auto-dev.sh --status
```

## ファイル構成

```
.
├── ISSUES.md          # バグ/問題の一覧
├── FEATURES.md        # 機能追加案の一覧
├── auto-dev.sh        # 起動スクリプト
└── auto-dev/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts        # メインループ
        └── task-manager.ts # タスク管理
```

## タスクフォーマット

```markdown
## タスクタイトル

- **Status**: pending | in_progress | completed
- **Priority**: high | medium | low

タスクの詳細説明...
```

## 必要な環境

- Node.js 18+
- OpenCode (設定済み)
- Git (設定済み、プッシュ権限あり)

## 耐障害性 (2026-02-20 更新)

- OpenCode の起動ポートは固定ではなく自動探索します（既定: `4096` から順に探索）
- タスク実行は `prompt_async` + `global/event` 監視で行い、長時間処理中も進捗ログを継続出力します
- ローカル接続断 (`ECONNREFUSED` など) のみ OpenCode サーバーを自動再起動して再試行します
- 一時的な API エラー (`429/5xx`、provider timeout) は種別ごとの指数バックオフで再試行します
- 進捗が 1 時間途絶えた session は自動 abort してリトライします
- `opencode auth login` 済みの provider のみを有効化して実行します（既存認証の強制利用）

## 環境変数

- `AUTO_DEV_OPENCODE_HOST`  
  既定: `127.0.0.1`
- `AUTO_DEV_OPENCODE_PORT`  
  既定: `4096`（探索開始ポート）
- `AUTO_DEV_OPENCODE_PORT_SCAN_SIZE`  
  既定: `20`（探索するポート数）
- `AUTO_DEV_OPENCODE_START_TIMEOUT_MS`  
  既定: `15000`
- `AUTO_DEV_OPENCODE_REQUEST_RETRIES`  
  既定: `3`
- `AUTO_DEV_RETRY_BASE_DELAY_MS`  
  既定: `1500`（一般リトライの初期待機）
- `AUTO_DEV_RETRY_MAX_DELAY_MS`  
  既定: `30000`（一般リトライの最大待機）
- `AUTO_DEV_RATE_LIMIT_RETRY_BASE_DELAY_MS`  
  既定: `10000`（`429` 系の初期待機）
- `AUTO_DEV_RATE_LIMIT_RETRY_MAX_DELAY_MS`  
  既定: `180000`
- `AUTO_DEV_TIMEOUT_RETRY_BASE_DELAY_MS`  
  既定: `8000`（provider timeout 系の初期待機）
- `AUTO_DEV_TIMEOUT_RETRY_MAX_DELAY_MS`  
  既定: `120000`
- `AUTO_DEV_PROGRESS_LOG_INTERVAL_MS`  
  既定: `10000`（AI 作業中の進捗ログ出力間隔）
- `AUTO_DEV_STATUS_POLL_INTERVAL_MS`  
  既定: `3000`（session 状態確認間隔）
- `AUTO_DEV_SESSION_STALL_TIMEOUT_MS`  
  既定: `3600000`（この時間進捗がなければ session abort）
- `AUTO_DEV_PROVIDER_TIMEOUT_MS`  
  既定: `600000`（provider リクエスト timeout）
- `AUTO_DEV_OPENCODE_AUTH_FILE`  
  既定: `~/.local/share/opencode/auth.json`（`XDG_DATA_HOME` 指定時はそちらを優先）

## トラブルシューティング

- `Task failed: fetch failed` が継続する場合:
  1. `opencode` の provider/APIキー設定を確認
  2. 既存 `opencode` プロセスとの競合を確認
  3. 必要に応じて `AUTO_DEV_OPENCODE_PORT` を変更
- 起動時に認証エラーになる場合:
  1. `opencode auth list` で認証済み provider があることを確認
  2. 認証ファイルの場所が違う場合は `AUTO_DEV_OPENCODE_AUTH_FILE` を指定
