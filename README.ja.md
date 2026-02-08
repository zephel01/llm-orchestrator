# LLM Orchestrator

[日本語](#llm-orchestrator) | [English](./README.md)

LLMによる自律的タスク実行のためのマルチエージェントシステム。

## 特徴

- **複数プロバイダー対応**: Anthropic Claude, OpenAI GPT, Ollama（ローカルモデル）
- **ベンダー非依存**: LLMプロバイダー間の切り替えが容易
- **ファイル/Valkeyバックエンド**: 柔軟な通信バックエンド
- **リードエージェントによるオーケストレーション**: タスク分解と計画（フェーズ1）
- **並列実行**: 複数のチームメイトエージェントによる同時作業（フェーズ2）
- **プラン承認ワークフロー**: 計画の基準に基づくレビュー（フェーズ3）
- **依存関係管理**: DAGベースのサブタスク依存関係とトポロジカルソート（フェーズ4）
- **進捗追跡**: 複数フォーマットによるリアルタイム進捗可視化（フェーズ4）
- **エラーリカバリ**: 指数バックオフリトライとエラー分類（フェーズ4）

## ローカルLLMプロバイダー

### Ollama

**概要**: 完全にオフラインで動作するローカルLLMランナー

**インストール**:
```bash
# macOS (Homebrew)
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
winget install Ollama.Ollama
```

**使用方法**:
```bash
# モデルのダウンロード
ollama pull phi3

# サーバーの起動
ollama serve
```

```bash
# Anthropic Claudeでチーム作成
llm-orchestrator create my-team --provider anthropic

# OpenAI GPTでチーム作成
llm-orchestrator create my-team --provider openai

# Ollama（ローカル）でチーム作成
llm-orchestrator create my-team --provider ollama --model phi3

# LM Studio（ローカル）でチーム作成
llm-orchestrator create my-team --provider lmstudio --model meta-llama-3.70b-instruct

# llama-server（ローカル）でチーム作成
llm-orchestrator create my-team --provider llama-server --model llama3.2:8b-instruct

# タスク実行
llm-orchestrator run my-team "Write a Python script"
```

**推奨モデル**:
- `phi3`（軽量、高速、テスト向き）
- `llama3.2:3b`（バランス良好）
- `llama3.2:8b`（高品質）
- `mistral:7b`（コード生成向き）

---

### LM Studio

**概要**: LM SystemsによるHugging Face統合機能付きローカルLLM環境

**インストール**:
```bash
# macOS (Homebrew)
brew install lmstudio

# または https://lmstudio.ai/ からダウンロード
```

**使用方法**:
```bash
# LM Studio起動（ポート1234で実行）
lmstudio

# APIエンドポイント: http://localhost:1234/v1
# 注: カスタムプロバイダー設定が必要（実装予定）
```

**推奨モデル**:
- `meta-llama-3-70b-instruct`
- `mistral-7b-instruct-v0.2`
- `gemma-2-27b-it`

---

### llama.cpp

**概要**: llama.cppベースの高性能ローカルLLMサーバー

**インストール**:
```bash
# macOS (Homebrew)
brew install llama.cpp

# またはソースからビルド
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make
```

**使用方法**:
```bash
# サーバー起動
llama-server --model ./models/llama-3.2-8b.gguf --port 8080

# APIエンドポイント: http://localhost:8080/v1
# 注: カスタムプロバイダー設定が必要（実装予定）
```

**推奨モデル**:
- `llama-3.2-8b-instruct`
- `mistral-7b-instruct-v0.2`
- `gemma-2-27b-it`

---

### プロバイダー比較

| 特徴 | Ollama | LM Studio | llama.cpp |
|---------|---------|-----------|-----------|
| セットアップの容易さ | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| パフォーマンス | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| メモリ効率 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| GPU対応 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| モデルの豊富さ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| GUI | ⭐ | ⭐⭐⭐⭐ | ⭐ |
| 安定性 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

**推奨**:
- **開発/テスト**: Ollama（セットアップが最も簡単、高速）
- **本番/高性能**: llama.cpp（最高のパフォーマンス、高度なオプション）
- **GUI/モデル管理**: LM Studio（優れたGUI、Hugging Face統合）

---

```bash
# 依存関係のインストール
npm install

# プロジェクトのビルド
npm run build
```

## インストール

### 前提条件

- Node.js 18+
- npm または yarn

### 依存関係のインストール

```bash
# 依存関係のインストール
npm install

# プロジェクトのビルド
npm run build
```

## クイックスタート

### 1. 初期化

```bash
npm run build
npm run orchestrator init
```

### 2. プロバイダーの設定

APIキーを環境変数として設定します:

```bash
# Anthropic Claudeの場合
export ANTHROPIC_API_KEY="your-api-key"

# OpenAIの場合
export OPENAI_API_KEY="your-api-key"

# Ollama（ローカル）の場合
# APIキーは不要、Ollamaが実行中であることを確認してください
```

### 3. プロバイダーのテスト

```bash
npm run orchestrator test-provider anthropic
# または
npm run orchestrator test-provider openai
# または
npm run orchestrator test-provider ollama
```

### 4. チームの作成

```bash
npm run orchestrator create my-team --provider anthropic
```

### 5. タスクの実行

```bash
npm run orchestrator run my-team "Create a simple Python script that calculates fibonacci numbers"
```

## CLIコマンド

```bash
# 環境の初期化
llm-orchestrator init

# チームの作成
llm-orchestrator create <name> [options]
  -p, --provider <type>  LLMプロバイダー（anthropic, openai, ollama）
  -m, --model <name>     モデル名

# チーム一覧
llm-orchestrator list

# チームの削除
llm-orchestrator delete <name>

# タスクの実行
llm-orchestrator run <team-name> <task> [options]
  -d, --dir <path>       作業ディレクトリ

# プロバイダーのテスト
llm-orchestrator test-provider <type> [options]
  -m, --model <name>     モデル名
  -u, --base-url <url>   ベースURL（ローカルプロバイダー用）
```

**利用可能なプロバイダー**: `anthropic`, `openai`, `ollama`, `lmstudio`, `llama-server`

## アーキテクチャ

```
src/
├── providers/           # LLMプロバイダーの抽象化
│   ├── interface.ts    # 共通インターフェース
│   ├── anthropic.ts    # Anthropicアダプター
│   ├── openai.ts       # OpenAIアダプター
│   ├── ollama.ts       # Ollamaアダプター
│   ├── lm-studio.ts    # LM Studioアダプター
│   ├── llama-server.ts  # llama-serverアダプター
│   └── factory.ts      # プロバイダーファクトリー
├── team-manager/       # チームライフサイクル管理
│   └── index.ts
├── agent-kernel/       # エージェント実行環境
│   └── index.ts
├── communication/      # メッセージングシステム（フェーズ1はファイルベース）
│   ├── interface.ts    # ストレージ抽象化
│   ├── file-store.ts   # ファイルバックエンド
│   └── valkey.ts      # Valkeyバックエンド（フェーズ2）
├── agents/             # エージェントの実装
│   ├── lead.ts         # リードエージェント
│   ├── teammate.ts     # チームメイトエージェント
│   ├── agent-manager.ts # エージェントマネージャー
│   └── index.ts
└── cli.ts              # CLIエントリーポイント
```

## フェーズ1の機能（現在）

- ✅ ファイルベースのメッセージングシステム
- ✅ LLMプロバイダーの抽象化（Anthropic, OpenAI, Ollama）
- ✅ チームマネージャー（基本的なライフサイクル）
- ✅ エージェントカーネル（コンテキスト管理）
- ✅ リードエージェント（ツール実行機能付きの単一エージェント）

## フェーズ2の機能（完了）

- ✅ 通信用Valkeyバックエンド（Redis互換）
- ✅ チームメイトの並列実行
- ✅ Redlock分散ロック

## フェーズ3の機能（完了）

- ✅ プラン承認ワークフロー
- ✅ テスト、セキュリティ、コスト基準の評価
- ✅ ローカルLLMプロバイダー（LM Studio, llama-server）

## フェーズ4の機能（完了）

- ✅ サブタスク依存関係管理（DAGベース）
- ✅ 進捗追跡可視化（インライン、プログレスバー、JSON）
- ✅ エラーリカバリメカニズム（指数バックオフ）

## フェーズ5の機能（実装中）

- ✅ 条件付き依存関係（成功ベース、失敗ベース、出力ベース）
- ✅ TUI Dashboard（ターミナルユーザーインターフェース）
  - ✅ エージェントパネル付き進捗追跡
  - ✅ リアルタイムログストリーミング
  - ✅ インタラクティブキーボードコントロール（q/ESCで終了）
- ✅ DAG可視化（ASCII/Unicode）
- ✅ tmux統合
- ✅ CLIとTUIの統合

### TUI Dashboard

TUI Dashboardは、ターミナル内でエージェントの進捗をリアルタイムで監視できるインタラクティブなUIです。

```bash
# デモモードで起動
llm-orchestrator tui

# チームを指定してライブモードで起動
llm-orchestrator run my-team "Write a Python script" --tui
```

#### tmux統合

tmuxを使用すると、複数のペインでTUI Dashboardとログを同時に監視できます。

```bash
# 2ペインレイアウト（TUI + ログ）
llm-orchestrator run my-team "Write a Python script" --tmux

# 3ペインレイアウト（TUI + エージェントログ + システムログ）
llm-orchestrator run my-team "Write a Python script" --tmux-advanced
```

**tmuxショートカット**:
- セッションからのデタッチ: `Ctrl+B`, その後 `D`
- セッションへのアタッチ: `tmux attach -t <session-name>`
- セッションの一覧表示: `llm-orchestrator tmux-list`
- セッションの終了: `llm-orchestrator tmux-kill <session-name>` または `tmux kill-session -t <session-name>`

**要件**:
- tmux 2.0以降
- 2ペインレイアウト: 端末サイズ 80x24 以上
- 3ペインレイアウト: 端末サイズ 120x30 以上

**インストール**:
```bash
# macOS
brew install tmux

# Linux (Ubuntu/Debian)
sudo apt-get install tmux

# Linux (Fedora)
sudo dnf install tmux
```

## 設定

設定は `~/.llm-orchestrator/` に保存されます:

```json
// ~/.llm-orchestrator/config.json (オプション、デフォルト用)
{
  "defaultProvider": {
    "type": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

チーム固有の設定:

```json
// ~/.llm-orchestrator/teams/{team-name}/config.json
{
  "name": "my-team",
  "createdAt": 1234567890,
  "leadProvider": {
    "type": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  },
  "uiMode": "inline"
}
```

## ライセンス

MIT
