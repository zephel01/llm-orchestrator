# LLM Orchestrator

English | [日本語](README.ja.md)

Multi-agent system for autonomous task execution with LLMs.

## Features

- **Multi-provider support**: Anthropic Claude, OpenAI GPT, Ollama (local models)
- **Vendor-agnostic**: Easy to switch between LLM providers
- **File/Valkey backend**: Flexible communication backends
- **Lead agent orchestration**: Task breakdown and planning (Phase 1)
- **Parallel execution**: Multiple teammate agents working concurrently (Phase 2)
- **Plan approval workflow**: Criteria-based review for plans (Phase 3)
- **Dependency management**: DAG-based subtask dependencies with topological sorting (Phase 4)
- **Progress tracking**: Real-time progress visualization with multiple formats (Phase 4)
- **Error recovery**: Exponential backoff retry and error classification (Phase 4)

## Local LLM Providers

### Ollama

**Overview**: Fully offline local LLM runner

**Installation**:
```bash
# macOS (Homebrew)
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
winget install Ollama.Ollama
```

**Usage**:
```bash
# Download a model
ollama pull phi3

# Start the server
ollama serve

# Create a team

```bash
# With Anthropic Claude
llm-orchestrator create my-team --provider anthropic

# With OpenAI GPT
llm-orchestrator create my-team --provider openai

# With Ollama (local)
llm-orchestrator create my-team --provider ollama --model phi3

# With LM Studio (local)
llm-orchestrator create my-team --provider lmstudio --model meta-llama-3.70b-instruct

# With llama-server (local)
llm-orchestrator create my-team --provider llama-server --model llama3.2:8b-instruct

# Run a task
llm-orchestrator run my-team "Write a Python script"
```

**Recommended Models**:
- `phi3` (lightweight, fast, good for testing)
- `llama3.2:3b` (balanced)
- `llama3.2:8b` (high quality)
- `mistral:7b` (good for code generation)

---

### LM Studio

**Overview**: Local LLM environment by LM Systems with Hugging Face integration

**Installation**:
```bash
# macOS (Homebrew)
brew install lmstudio

# Or download from https://lmstudio.ai/
```

**Usage**:
```bash
# Start LM Studio (runs on port 1234)
lmstudio

# API endpoint: http://localhost:1234/v1
# Note: Requires custom provider configuration (not yet implemented)
```

**Recommended Models**:
- `meta-llama-3-70b-instruct`
- `mistral-7b-instruct-v0.2`
- `gemma-2-27b-it`

---

### llama.cpp

**Overview**: High-performance local LLM server based on llama.cpp

**Installation**:
```bash
# macOS (Homebrew)
brew install llama.cpp

# Or build from source
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make
```

**Usage**:
```bash
# Start server
llama-server --model ./models/llama-3.2-8b.gguf --port 8080

# API endpoint: http://localhost:8080/v1
# Note: Requires custom provider configuration (not yet implemented)
```

**Recommended Models**:
- `llama-3.2-8b-instruct`
- `mistral-7b-instruct-v0.2`
- `gemma-2-27b-it`

---

### Provider Comparison

| Feature | Ollama | LM Studio | llama.cpp |
|---------|---------|-----------|-----------|
| Ease of Setup | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| Performance | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Memory Efficiency | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| GPU Support | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Model Variety | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| GUI | ⭐ | ⭐⭐⭐⭐ | ⭐ |
| Stability | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

**Recommendations**:
- **Development/Testing**: Ollama (easiest to set up, fast)
- **Production/High-Perf**: llama.cpp (best performance, advanced options)
- **GUI/Model Management**: LM Studio (great GUI, Hugging Face integration)

---

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn

### Install Dependencies

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Quick Start

### 1. Initialize

```bash
npm run build
npm run orchestrator init
```

### 2. Configure Provider

Set your API key as environment variable:

```bash
# For Anthropic Claude
export ANTHROPIC_API_KEY="your-api-key"

# For OpenAI
export OPENAI_API_KEY="your-api-key"

# For Ollama (local)
# No API key needed, just make sure Ollama is running
```

### 3. Test Provider
205:npm run orchestrator test-provider anthropic
207:npm run orchestrator test-provider openai
209:npm run orchestrator test-provider ollama

### 4. TUI Tests
210:npm run test:tui
211:npm run tui:demo
212:npm run tui -- --debug
213:npm run tui -- --verbose

### 5. Run Full Test Suite
215:npm test
216:npm test -- --coverage

### 6. Run Specific Tests
217:npm run test:unit
218:npm run test:dependencies
219:npm run test:progress
220:npm run test:recovery

# Test Provider
246:llm-orchestrator test-provider <type> [options]
  - ✅ Test, security, and cost criteria evaluation

# TUI Tests
247:npm run test:tui
  - Run all TUI component tests
  - See [TUI Tests](tests/TUI_TESTS_README.md) for details

# TUI Demo
248:npm run tui:demo
  - Run TUI dashboard demo without Jest
  - Useful for manual testing and visual verification

# Coverage
250:npm test -- --coverage
  - Generate coverage report
  - View at ./coverage/lcov-report/index.html
- ✅ Local LLM providers (LM Studio, llama-server)

## Phase 4 Features (Completed)

- ✅ Subtask dependency management (DAG-based)
- ✅ Progress tracking visualization (inline, progress bar, JSON)
- ✅ Error recovery mechanisms (exponential backoff)

## Phase 5 Features (In Progress)

- ✅ Conditional dependencies (success-based, failure-based, output-based)
- ✅ TUI Dashboard (Terminal User Interface)
  - ✅ Agent panel with progress tracking
  - ✅ Real-time log streaming
  - ✅ Interactive keyboard controls (q/ESC to quit)
- ✅ DAG visualization (ASCII/Unicode)
- ✅ tmux integration
- ✅ CLI and TUI integration

### TUI Dashboard

The TUI Dashboard provides an interactive UI for monitoring agent progress in real-time within your terminal.

```bash
# Launch in demo mode
llm-orchestrator tui

# Launch with specific team in live mode
llm-orchestrator run my-team "Write a Python script" --tui
```

#### tmux Integration

With tmux, you can monitor TUI Dashboard and logs simultaneously in multiple panes.

```bash
# 2-pane layout (TUI + Logs)
llm-orchestrator run my-team "Write a Python script" --tmux

# 3-pane layout (TUI + Agent Logs + System Logs)
llm-orchestrator run my-team "Write a Python script" --tmux-advanced
```

**tmux Shortcuts**:
- Detach from session: `Ctrl+B`, then `D`
- Attach to session: `tmux attach -t <session-name>`
- List sessions: `llm-orchestrator tmux-list`
- Kill session: `llm-orchestrator tmux-kill <session-name>` or `tmux kill-session -t <session-name>`

**Requirements**:
- tmux 2.0 or later
- 2-pane layout: Terminal size 80x24 or larger
- 3-pane layout: Terminal size 120x30 or larger

**Installation**:
```bash
# macOS
brew install tmux

# Linux (Ubuntu/Debian)
sudo apt-get install tmux

# Linux (Fedora)
sudo dnf install tmux
```

## Configuration

Configuration is stored in `~/.llm-orchestrator/`:

```json
// ~/.llm-orchestrator/config.json (optional, for defaults)
{
  "defaultProvider": {
    "type": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

Team-specific config:

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

## License

MIT

## Development Guide

For detailed instructions on how to use this tool for development, see [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md).
