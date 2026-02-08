# LLM Orchestrator - 開発ガイド

このガイドでは、LLM Orchestratorを使ってプログラムを開発する具体的な手順を説明します。

---

## 📦 インストール方法

### 方法1: グローバルインストール（推奨）

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd llm-orchestrator

# 2. 依存関係をインストール
npm install

# 3. ビルド
npm run build

# 4. グローバルインストール
npm install -g .
```

**実行方法:**
```bash
llm-orchestrator create my-team --provider anthropic
llm-orchestrator run my-team "タスク" --tmux
```

---

### 方法2: npm link（開発中）

```bash
# 1. 依存関係をインストール
npm install

# 2. ビルド
npm run build

# 3. グローバルリンク
npm link
```

**実行方法:**
```bash
llm-orchestrator create my-team --provider anthropic
llm-orchestrator run my-team "タスク" --tmux
```

**リンク解除:**
```bash
npm unlink -g llm-orchestrator
```

---

### 方法3: ローカル実行（開発中）

```bash
# 1. 依存関係をインストール
npm install

# 2. ビルド
npm run build

# 3. 実行
npm run start create my-team --provider anthropic
npm run start run my-team "タスク" --tmux

# または
node dist/cli.js create my-team --provider anthropic
node dist/cli.js run my-team "タスク" --tmux
```

---

## 🔍 推奨する使い分け

| シチュエーション | 方法 | コマンド |
|----------------|------|---------|
| **通常使用** | グローバル | `npm install -g .` → `llm-orchestrator ...` |
| **開発中** | ローカル | `npm run start ...` または `node dist/cli.js ...` |
| **頻繁な開発** | npm link | `npm link` → `llm-orchestrator ...` |

---

## ⚙️ 設定

### APIキーの設定

```bash
# Anthropic Claude
export ANTHROPIC_API_KEY="your-api-key"

# OpenAI
export OPENAI_API_KEY="your-api-key"

# シェル設定に追加（永続化）
echo 'export ANTHROPIC_API_KEY="your-api-key"' >> ~/.zshrc  # zsh
echo 'export ANTHROPIC_API_KEY="your-api-key"' >> ~/.bashrc  # bash
source ~/.zshrc  # または source ~/.bashrc
```

---

---

## 📋 概要

LLM Orchestratorは、**「人間がタスクを渡すと、複数のAIエージェントが自動的にプログラムを書く」**ツールです。

```
あなた（人間）
    ↓
「フィボナッチ数列を計算するPythonプログラムを書いて」
    ↓
Lead Agent（リーダーAI）
    ↓
Teammate Agents（開発AIエージェントたち）
    ├─ agent-1: メインプログラムを書く
    ├─ agent-2: テストを書く
    └─ agent-3: ドキュメントを書く
    ↓
完成したプログラム
```

---

## 🚀 クイックスタート：完全なワークフロー

### ステップ1: 環境準備

```bash
# 1. チームを作成
llm-orchestrator create my-dev-team --provider anthropic

# 2. 作業ディレクトリを作成
mkdir my-project
cd my-project

# 3. チームを初期化（必要な場合）
llm-orchestrator init
```

### ステップ2: タスクを渡す（これだけ！）

```bash
# tmuxで監視しながら実行
llm-orchestrator run my-dev-team "フィボナッチ数列を計算するPythonプログラムを書いて" --tmux

# またはシンプルに実行
llm-orchestrator run my-dev-team "フィボナッチ数列を計算するPythonプログラムを書いて"
```

### ステップ3: エージェントが自動で作業

Lead Agentが以下を自動で行います：

1. **タスクを分解**
   - メインプログラムを書く
   - テストを書く
   - ドキュメントを書く

2. **エージェントを生成**
   - `teammate-1`: メインプログラム担当
   - `teammate-2`: テスト担当
   - `teammate-3`: ドキュメント担当

3. **並列実行**
   - 各エージェントが同時に作業

4. **結果統合**
   - 完成したファイルを作成

### ステップ4: 結果を確認

```bash
# 生成されたファイルを確認
ls -la
# 出力例:
# fibonacci.py
# test_fibonacci.py
# README.md

# テストを実行
python test_fibonacci.py

# プログラムを実行
python fibonacci.py
```

---

## 📝 指示方法の種類

### 方法1: シンプルなタスク（一行で指定）

```bash
llm-orchestrator run my-dev-team "フィボナッチ数列を計算するPythonプログラムを書いて"
```

**何が起こるか:**
- エージェントがタスクを自動分解
- 必要なファイルをすべて作成

---

### 方法2: 詳細なタスク（複数行で指定）

```bash
llm-orchestrator run my-dev-team "
REST APIサーバーを作成してください。

要件:
- 言語: Python (FastAPI)
- 機能:
  * ユーザー登録/認証
  * CRUD操作
  * データベース: SQLite
- テストを含める
- Docker化
"
```

**何が起こるか:**
- Lead Agentが要件を分析
- 各機能を担当エージェントに割り当て
- APIエンドポイント、データベース、テスト、Dockerfileを作成

---

### 方法3: 既存プロジェクトの拡張

```bash
# 既存のプロジェクトディレクトリで実行
cd my-existing-project

llm-orchestrator run my-dev-team "
既存のアプリケーションに以下の機能を追加してください:
1. ロギング機能
2. エラーハンドリングの改善
3. ユニットテストの追加
"
```

**何が起こるか:**
- 既存コードを分析
- 必要な変更を検出
- 新しい機能を追加

---

## 📂 指示書・ファイルの場所

### 1. チーム設定ファイル

```bash
~/.llm-orchestrator/teams/my-dev-team/config.json
```

**内容:**
```json
{
  "name": "my-dev-team",
  "leadProvider": {
    "type": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  },
  "uiMode": "inline"
}
```

**何をするもの:**
- 使用するAIモデルの設定
- プロバイダー（Anthropic/OpenAI/Ollama）の設定

---

### 2. 通信メッセージ

```bash
~/.llm-orchestrator/teams/my-dev-team/messages/
├── lead/              # Lead Agentへのメッセージ
├── teammate-1/        # agent-1へのメッセージ
├── teammate-2/        # agent-2へのメッセージ
└── teammate-3/        # agent-3へのメッセージ
```

**何をするもの:**
- エージェント間の通信
- タスクの割り当て
- 結果の報告

**見る必要はありません**（自動で管理されます）

---

### 3. 作業ファイル（あなたが書く場所）

```bash
# プロジェクトディレクトリ（現在のディレクトリ）
./
├── fibonacci.py        # エージェントが作成
├── test_fibonacci.py  # エージェントが作成
└── README.md          # エージェントが作成
```

**何をするもの:**
- 実際のプログラムコード
- テストファイル
- ドキュメント

**ここが主な作業場所です！**

---

### 4. グローバル状態（サブタスクなど）

```bash
~/.llm-orchestrator/teams/my-dev-team/state/
└── subtasks.json      # 実行中のタスク一覧
```

**何をするもの:**
- 進捗管理
- 依存関係の追跡

---

## 💡 具体的な開発シナリオ

### シナリオ1: 新規プロジェクトの作成

```bash
# 1. プロジェクトディレクトリを作成
mkdir todo-app
cd todo-app

# 2. タスクを渡す
llm-orchestrator run my-dev-team "
Todoアプリを作成してください。

要件:
- フロントエンド: React
- バックエンド: Node.js (Express)
- データベース: SQLite
- 機能:
  * タスクの追加・削除・編集
  * タスクの完了状態切り替え
  * ローカルストレージに保存

追加要件:
- テストを含める
- README.mdを書く
- 動作手順を含める
" --tmux

# 3. 結果を確認
ls -la
# 出力:
# frontend/
#   src/
#     App.js
#     index.js
# backend/
#   server.js
#   package.json
# tests/
#   test.js
# README.md
```

---

### シナリオ2: 既存コードのデバッグ

```bash
# 1. バグのあるコードがあるディレクトリへ
cd my-buggy-project

# 2. デバッグを依頼
llm-orchestrator run my-dev-team "
以下のバグを修正してください:

buggy_function.pyのcalculate_sum関数で、
負の数を渡すと正しく動作しません。

期待する動作:
- 負の数も合算できる
- 空のリストの場合は0を返す

テストも修正してください。
"

# 3. 修正結果を確認
python test.py
```

---

### シナリオ3: コードのリファクタリング

```bash
# 1. リファクタリングしたいプロジェクトへ
cd my-legacy-code

# 2. リファクタリングを依頼
llm-orchestrator run my-dev-team "
以下のリファクタリングを行ってください:

1. 関数をモジュール化
2. クラス化を検討
3. 型ヒントを追加（Pythonの場合）
4. エラーハンドリングを改善
5. コードの重複を排除
6. ドキュメントを追加

既存の動作は維持してください。
テストを書いて既存機能が壊れていないことを確認してください。
"
```

---

## 🔍 TUI Dashboardでの監視

### tmuxセッションのペイアウト

```bash
llm-orchestrator run my-dev-team "タスク" --tmux
```

**レイアウト:**
```
┌─────────────────────────────────────────────────┐
│ 📊 TUI Dashboard (70%)                    │
│ ┌───────────────────────────────────────────┐ │
│ │ Agent: agent-1                         │ │
│ │ • Write main code                       │ │
│ │   Status: in_progress                  │ │
│ │   [████████░░] 80%                   │ │
│ └───────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────┐ │
│ │ Agent: agent-2                         │ │
│ │ • Write tests                          │ │
│ │   Status: waiting                      │ │
│ └───────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ 📝 Agent Logs (30%)                      │
│ [10:00:00] Task received                 │
│ [10:00:05] Breaking down task...          │
│ [10:00:10] Assigned to agent-1          │
│ [10:00:15] Writing code...               │
└─────────────────────────────────────────────────┘
```

**キー操作:**
- `Ctrl+B`, `D`: セッションからデタッチ
- `Ctrl+B`, `→/←/↑/↓`: ペイン間の移動

---

## 🛠️ 進んだ使い方

### 1. 特定のエージェントにタスクを指示

```bash
# プロジェクトディレクトリで実行
llm-orchestrator run my-dev-team "
agent-1: メインロジックを実装してください
agent-2: テストを書いてください
agent-3: ドキュメントを書いてください

タスク: Webスクレイパーを作成
"
```

### 2. 条件付き実行

```bash
llm-orchestrator run my-dev-team "
以下の手順で開発してください:

1. ユニットテストを書く（失敗することを確認）
2. メインコードを実装
3. テストが通ることを確認
4. テストが失敗したら手順2に戻る

タスク: 並列処理モジュール
"
```

### 3. 反復的な開発

```bash
# 1回目: プロトタイプ
llm-orchestrator run my-dev-team "シンプルなプロトタイプを作成" --tui

# 結果を確認...

# 2回目: 機能追加
llm-orchestrator run my-dev-team "
以下の機能を追加してください:
1. エラーハンドリング
2. ロギング
3. 設定ファイル対応
"

# 結果を確認...

# 3回目: リファクタリング
llm-orchestrator run my-dev-team "コードをリファクタリングしてください"
```

---

## 📚 よくある質問

### Q1: 指示はどこに書けばいいですか？

**A:** コマンドラインで直接渡します。

```bash
llm-orchestrator run my-dev-team "ここに指示を書く"
```

ファイルに書いて渡すこともできます：

```bash
# 指示をファイルに書く
echo "タスクの内容" > task.txt

# ファイルから読み込んで実行
llm-orchestrator run my-dev-team "$(cat task.txt)"
```

---

### Q2: エージェントがどのようなファイルを作るかを指定できますか？

**A:** はい、タスクに含めてください。

```bash
llm-orchestrator run my-dev-team "
以下のファイル構成でプロジェクトを作成してください:

src/
  main.py       # メインロジック
  utils.py      # ユーティリティ関数
tests/
  test_main.py  # テスト
README.md       # ドキュメント

タスク: フィボナッチ数列計算プログラム
"
```

---

### Q3: 複数のタスクを一度に依頼できますか？

**A:** はい、リストで渡します。

```bash
llm-orchestrator run my-dev-team "
以下のタスクを実行してください:

1. ユーザー認証機能を実装
2. データベース接続を設定
3. APIエンドポイントを作成
4. テストを書く
5. ドキュメントを書く

言語: Python (FastAPI)
"
```

---

### Q4: 既存のコードに変更を加える方法は？

**A:** 現在のディレクトリで実行します。

```bash
cd my-project
llm-orchestrator run my-dev-team "
main.pyに以下の変更を加えてください:
1. ロギング機能を追加
2. エラーハンドリングを改善
3. 型ヒントを追加
"
```

---

### Q5: エージェントの作業中に介入できますか？

**A:** tmuxで監視中に直接介入できます。

```bash
# tmuxセッションで実行
llm-orchestrator run my-dev-team "タスク" --tmux

# tmux内で任意のペインに移動してコマンド実行
Ctrl+B, ↑/↓ でペイン移動
```

---

## 🎯 実践的なワークフロー例

### 例1: Webアプリ開発

```bash
# 1日目: 基本構成
mkdir my-webapp
cd my-webapp
llm-orchestrator run my-dev-team "
React + Node.js + SQLiteのWebアプリを作成
機能: ユーザー管理、CRUD操作
テストを含める
" --tmux

# 2日目: 機能追加
llm-orchestrator run my-dev-team "
以下の機能を追加:
- 認証機能
- ログイン画面
- ユーザープロフィール
"

# 3日目: リファクタリング
llm-orchestrator run my-dev-team "
コードをリファクタリング:
- クラス化
- モジュール化
- エラーハンドリング改善
"
```

---

### 例2: データ分析プロジェクト

```bash
mkdir data-analysis
cd data-analysis

llm-orchestrator run my-dev-team "
データ分析プロジェクトを作成

要件:
- 言語: Python
- ライブラリ: pandas, matplotlib, numpy
- データソース: CSVファイルを想定
- 機能:
  * データ読み込み
  * データクリーニング
  * 統計分析
  * 可視化（グラフ）
  * レポート生成

出力:
- analysis.py
- test_analysis.py
- README.md（使い方）
"
```

---

## 📝 まとめ

### 指示の流れ

```
1. プロジェクトディレクトリに移動
   cd my-project

2. タスクを渡す（これだけ！）
   llm-orchestrator run my-dev-team "タスクの内容" --tmux

3. 結果を確認
   ls -la

4. 必要なら修正・追加
   llm-orchestrator run my-dev-team "修正内容"
```

### ファイルの場所

| ファイル | 場所 | 説明 |
|---------|------|------|
| **プログラム** | `./` (現在のディレクトリ) | エージェントが作成したファイル |
| **チーム設定** | `~/.llm-orchestrator/teams/` | AIモデルの設定など |
| **通信メッセージ** | `~/.llm-orchestrator/teams/my-team/messages/` | エージェント間の通信（自動管理） |
| **進捗状態** | `~/.llm-orchestrator/teams/my-team/state/` | タスクの進捗（自動管理） |

### あなたがすること

1. ✅ タスクを決める
2. ✅ コマンドを実行する
3. ✅ 結果を確認する
4. ✅ 必要なら修正を依頼する

### エージェントがすること

- ✅ タスクを分解
- ✅ 計画を立てる
- ✅ コードを書く
- ✅ テストを書く
- ✅ ドキュメントを書く
- ✅ 結果を統合

---

## 🆘 困ったとき

### 問題: エージェントが想定通り動かない

**解決:**
1. タスクをより具体的にする
2. 要件を詳細に書く
3. ファイル構造を指定する

### 問題: tmuxセッションがうまく動かない

**解決:**
1. 端末サイズを確認（80x24以上）
2. `--tmux-advanced`ではなく`--tmux`を試す
3. tmuxセッションを再作成

### 問題: コードが生成されない

**解決:**
1. タスクが明確か確認
2. プロバイダー設定を確認（APIキーなど）
3. ログを確認（`--debug`オプション）

---

** Happy Coding with AI Agents! 🤖✨ **
