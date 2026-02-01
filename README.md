# STT Simple

Macネイティブの音声文字起こしアプリケーション。

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Swift](https://img.shields.io/badge/Swift-6.2-orange.svg)
![Python](https://img.shields.io/badge/Python-3.10-blue.svg)

## 特徴

- メニューバー常駐アプリ
- グローバルホットキー（Ctrl+Option+Space）で録音開始/停止
- OpenAI Whisperによる高精度な文字起こし
- 自動でテキストをカーソル位置に入力
- 完全オープンソース（MIT License）

## インストール

### DMGからインストール（推奨）

1. [最新リリース](https://github.com/yourusername/stt-simple/releases/latest)からSTTApp.dmgをダウンロード
2. ダウンロードしたDMGをダブルクリック
3. STTApp.appをApplicationsフォルダにドラッグ
4. 初回起動時のセキュリティ警告で「開く」をクリック

### ソースからビルド

#### 前提条件

- macOS 13.0以降
- Xcode 15.0以降
- Python 3.10
- uv

#### インストール手順

1. レポジトリをクローン
```bash
git clone https://github.com/yourusername/stt-simple.git
cd stt-simple
```

2. Python仮想環境の設定
```bash
uv venv
source .venv/bin/activate
```

3. 依存パッケージのインストール
```bash
uv pip install -r requirements.txt
```

4. Swiftアプリのビルド
```bash
cd STTApp
swift build
```

5. アプリケーションの作成
```bash
./scripts/create_app.sh
```

## 使用方法

### 起動

DMGからインストールした場合：
1. LaunchpadからSTTAppを起動
2. または `open /Applications/STTApp.app`

ソースからビルドした場合：
```bash
cd STTApp
swift run
```

### 初期設定

1. **マイク権限**: 初回起動時にマイクへのアクセス権限を許可してください
2. **アクセシビリティ権限**: グローバルホットキーを使用するには、
   システム環境設定 > セキュリティとプライバシー > アクセシビリティ でSTTAppを許可してください

### 操作

1. アプリを起動すると、メニューバーに「STT」が表示されます
2. **Ctrl+Option+Space**を押すと録音が開始されます
3. もう一度**Ctrl+Option+Space**を押すと録音が停止します
4. 録音が完了すると、自動的に文字起こしが行われ、カーソル位置にテキストが入力されます
5. メニューの「Quit」または**Cmd+Q**で終了します

## セキュリティ警告について

このアプリは無料のアドホック署名で配布されているため、初回起動時にGatekeeperの警告が表示されます。

### 警告が表示された場合

**方法1: ダブルクリックで「開く」**
1. 右クリックまたはCtrl+クリック
2. 「開く」を選択

**方法2: システム環境設定で許可**
1. システム環境設定 > セキュリティとプライバシー
2. 「開く」をクリック

これはAppleの署名がないための正常な動作です。以降は警告なしで起動できます。

## プロジェクト構成

```
stt-simple/
├── features/
│   └── whisper_transcription/
│       ├── server.py           # Whisperサーバー
│       └── tests/              # テストスクリプト
├── STTApp/                     # Swiftアプリ
│   ├── Sources/STTApp/
│   │   ├── AppDelegate.swift
│   │   ├── MenuBarController.swift
│   │   ├── HotkeyManager.swift
│   │   ├── AudioRecorder.swift
│   │   ├── PythonProcessManager.swift
│   │   └── KeystrokeSimulator.swift
│   ├── Package.swift
│   └── scripts/
│       ├── create_app.sh        # アプリ作成スクリプト
│       └── create_dmg.sh       # DMG作成スクリプト
├── requirements.txt             # Python依存
├── LICENSE                    # MIT License
└── README.md                  # このファイル
```

## テスト

### Whisperサーバーのテスト

```bash
.venv/bin/python features/whisper_transcription/tests/test_basic.py
```

### 統合テスト

```bash
.venv/bin/python test_integration.py
```

### 型検査とリンティング

```bash
# 型検査（ty）
.venv/bin/ty check features/whisper_transcription/

# リンティング（ruff）
.venv/bin/ruff check features/whisper_transcription/

# フォーマット
.venv/bin/ruff format features/whisper_transcription/
```

## 開発

### ビルド

```bash
cd STTApp
swift build
```

### 実行

```bash
cd STTApp
swift run
```

### DMG作成（リリース用）

```bash
cd STTApp
./scripts/create_dmg.sh
```

## トラブルシューティング

### マイクの権限
初回起動時にマイクへのアクセス権限を許可する必要があります。

### Whisperモデルのダウンロード
初回起動時にWhisperモデル（large-v3、約3GB）がダウンロードされます。

### ホットキーが動作しない
システム環境設定 > セキュリティとプライバシー > アクセシビリティ でSTTAppを許可してください。

### Pythonプロセスが起動しない
`.venv`フォルダが正しく設定されているか確認してください。

## リリース

リリースバイナリは[Releases](https://github.com/yourusername/stt-simple/releases)からダウンロードできます。

## ライセンス

[MIT License](LICENSE)

## 貢献

プルリクエストを歓迎します。

## 制限事項

- **マイクの権限**: システム設定で許可が必要
- **アクセシビリティ権限**: ホットキーとキーボードシミュレーションに必要
- **Whisperモデル**: 初回起動時に約3GBダウンロード
- **CPU処理**: WhisperはCPUで動作するため、処理時間がかかる場合があります

## Roadmap

- [ ] GPU加速の対応
- [ ] 複数言語のサポート
- [ ] キーボードショートカットのカスタマイズ
- [ ] 自動更新機能
- [ ] 設定UIの実装
