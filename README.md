# LLM Orchestrator

Multi-agent system for autonomous task execution with LLMs.

## Features

- **Multi-provider support**: Anthropic Claude, OpenAI GPT, Ollama (local models)
- **Vendor-agnostic**: Easy to switch between LLM providers
- **File-based communication**: No external dependencies for Phase 1
- **Lead agent orchestration**: Task breakdown and planning (Phase 1)
- **Extensible architecture**: Ready for Phase 2 features (Valkey, parallel execution, etc.)

## Installation

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
```

## Architecture

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

## Phase 2 Roadmap (Future)

- [ ] Valkey backend for communication (Redis-compatible)
- [ ] Parallel teammate execution
- [ ] Plan approval workflow
- [ ] tmux/iTerm2 split view UI
- [ ] Cost monitoring and budgeting

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
