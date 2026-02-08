# LLM Orchestrator

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

```bash
npm run orchestrator test-provider anthropic
# or
npm run orchestrator test-provider openai
# or
npm run orchestrator test-provider ollama
```

### 4. Create a Team

```bash
npm run orchestrator create my-team --provider anthropic
```

### 5. Run a Task

```bash
npm run orchestrator run my-team "Create a simple Python script that calculates fibonacci numbers"
```

## CLI Commands

```bash
# Initialize environment
llm-orchestrator init

# Create a team
llm-orchestrator create <name> [options]
  -p, --provider <type>  LLM provider (anthropic, openai, ollama)
  -m, --model <name>     Model name

# List teams
llm-orchestrator list

# Delete a team
llm-orchestrator delete <name>

# Run a task
llm-orchestrator run <team-name> <task> [options]
  -d, --dir <path>       Working directory

# Test provider
llm-orchestrator test-provider <type> [options]
  -m, --model <name>     Model name
  -u, --base-url <url>   Base URL (for local providers)
```

**Available Providers**: `anthropic`, `openai`, `ollama`, `lmstudio`, `llama-server`

## Architecture

```
src/
├── providers/           # LLM provider abstraction
│   ├── interface.ts    # Common interface
│   ├── anthropic.ts    # Anthropic adapter
│   ├── openai.ts       # OpenAI adapter
│   ├── ollama.ts       # Ollama adapter
│   ├── lm-studio.ts    # LM Studio adapter
│   ├── llama-server.ts  # llama-server adapter
│   └── factory.ts      # Provider factory
├── team-manager/       # Team lifecycle management
│   └── index.ts
├── agent-kernel/       # Agent execution environment
│   └── index.ts
├── communication/      # Messaging system (file-based in Phase 1)
│   ├── interface.ts    # Storage abstraction
│   ├── file-store.ts   # File backend
│   └── valkey.ts      # Valkey backend (Phase 2)
├── agents/             # Agent implementations
│   ├── lead.ts         # Lead agent
│   ├── teammate.ts     # Teammate agent
│   ├── agent-manager.ts # Agent manager
│   └── index.ts
└── cli.ts              # CLI entry point
```
src/
├── providers/           # LLM provider abstraction
│   ├── interface.ts    # Common interface
│   ├── anthropic.ts    # Anthropic adapter
│   ├── openai.ts       # OpenAI adapter
│   ├── ollama.ts       # Ollama adapter
│   └── factory.ts      # Provider factory
├── team-manager/       # Team lifecycle management
│   └── index.ts
├── agent-kernel/       # Agent execution environment
│   └── index.ts
├── communication/      # Messaging system (file-based in Phase 1)
│   ├── interface.ts    # Storage abstraction
│   ├── file-store.ts  # File backend
│   └── valkey.ts      # Valkey backend (Phase 2)
├── agents/             # Agent implementations
│   └── lead.ts         # Lead agent
└── cli.ts              # CLI entry point
```

## Phase 1 Features (Current)

- ✅ File-based messaging system
- ✅ LLM provider abstraction (Anthropic, OpenAI, Ollama)
- ✅ Team Manager (basic lifecycle)
- ✅ Agent Kernel (context management)
- ✅ Lead Agent (single agent with tool execution)

## Phase 2 Features (Completed)

- ✅ Valkey backend for communication (Redis-compatible)
- ✅ Parallel teammate execution
- ✅ Redlock distributed locking

## Phase 3 Features (Completed)

- ✅ Plan approval workflow
- ✅ Test, security, and cost criteria evaluation
- ✅ Local LLM providers (LM Studio, llama-server)

## Phase 4 Features (Completed)

- ✅ Subtask dependency management (DAG-based)
- ✅ Progress tracking visualization (inline, progress bar, JSON)
- ✅ Error recovery mechanisms (exponential backoff)

## Phase 5 Roadmap (Future)

- [ ] Conditional dependencies (success-based)
- [ ] Advanced progress visualization (Web UI, graphs)
- [ ] Machine learning for optimal recovery strategies
- [ ] Distributed system support
- [ ] tmux/iTerm2 split view UI

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
