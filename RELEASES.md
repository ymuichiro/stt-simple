# Release Notes

## [1.0.0] - 2025-01-31

### Initial Release

#### Features
- メニューバー常駐アプリケーション
- グローバルホットキー（Ctrl+Option+Space）による録音開始/停止
- OpenAI Whisper large-v3モデルによる高精度な日本語文字起こし
- 自動でテキストをカーソル位置に入力（Cmd+Vシミュレーション）
- Whisperサーバーとの自動連携

#### 技術仕様
- **言語**: Swift 6.2 + Python 3.13
- **音声認識**: OpenAI Whisper large-v3
- **署名**: アドホック署名（無料配布）

#### インストール方法
1. STTApp-1.0.0.dmgをダウンロード
2. DMGをダブルクリック
3. STTApp.appをApplicationsフォルダにドラッグ
4. 初回起動時にセキュリティ警告が出たら「開く」をクリック

#### 初期設定
- マイクの権限を許可
- アクセシビリティ権限を許可（ホットキーとキーボードシミュレーション）

#### 既知の制限
- 初回起動時のGatekeeper警告（アドホック署名のため）
- Whisperモデルのダウンロード（約3GB）
- CPUでの処理（処理時間はPCスペックに依存）
- 日本語のみ対応

#### システム要件
- macOS 13.0以降
- Intel or Apple Silicon

#### 開発者情報
- 完全オープンソース（MIT License）
- ソースコード: https://github.com/yourusername/stt-simple
