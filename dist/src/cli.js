#!/usr/bin/env node
import { Command } from 'commander';
import { TeamManager } from './team-manager/index.js';
import { LeadAgent } from './agents/index.js';
import { createProvider } from './providers/index.js';
import { createBackend } from './communication/index.js';
import { ApprovalCriteriaEvaluator } from './approval/index.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createTuiSession, createAdvancedSession, killSession, listOrchestratorSessions, isTmuxAvailable } from './tui/tmux-integration.js';
// ESM用の__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const program = new Command();
program
    .name('llm-orchestrator')
    .description('Multi-agent system for autonomous task execution')
    .version('0.5.0');
// Initialize
program
    .command('init')
    .description('Initialize LLM Orchestrator environment')
    .action(async () => {
    const teamManager = new TeamManager();
    await teamManager.initializeGlobal();
    console.log('LLM Orchestrator environment initialized.');
    console.log('Config directory:', path.join(process.env.HOME || '.', '.llm-orchestrator'));
});
// Create team
program
    .command('create <name>')
    .description('Create a new team')
    .option('-p, --provider <type>', 'LLM provider type (anthropic, openai, ollama, lmstudio, llama-server)')
    .option('-m, --model <name>', 'Model name')
    .option('-u, --base-url <url>', 'Base URL (for local providers)')
    .option('-t, --teammate-provider <type>', 'Teammate LLM provider type')
    .option('-tm, --teammate-model <name>', 'Teammate model name')
    .option('-tu, --teammate-base-url <url>', 'Teammate base URL (for local providers)')
    .option('-b, --backend <type>', 'Communication backend type (file, valkey)')
    .option('-d, --dir <path>', 'Team data directory', process.cwd())
    .option('--require-tests', 'Require test criteria for approval')
    .option('--require-security', 'Require security criteria for approval')
    .option('--max-tokens <number>', 'Maximum tokens for cost-based approval')
    .option('--max-cost <number>', 'Maximum cost USD for cost-based approval')
    .action(async (name, options) => {
    const teamManager = new TeamManager();
    const approvalCriteria = {};
    // 承認基準の構成
    if (options.requireTests) {
        approvalCriteria.test = {
            requireTests: true,
            // テスト結果は実行時に提供される
        };
    }
    if (options.requireSecurity) {
        approvalCriteria.security = ApprovalCriteriaEvaluator.getStrictSecurityCriteria();
    }
    if (options.maxTokens || options.maxCost) {
        approvalCriteria.cost = ApprovalCriteriaEvaluator.getDefaultCostCriteria(options.maxTokens ? parseInt(options.maxTokens, 10) : undefined);
        if (options.maxCost) {
            approvalCriteria.cost.maxCost = parseFloat(options.maxCost);
        }
    }
    const config = {
        name,
        createdAt: Date.now(),
        backend: options.backend,
        leadProvider: {
            type: options.provider,
            model: options.model,
            baseURL: options.baseUrl,
        },
        teammateProvider: options.teammateProvider ? {
            type: options.teammateProvider,
            model: options.teammateModel,
            baseURL: options.teammateBaseUrl,
        } : undefined,
        uiMode: 'inline',
        approvalCriteria: Object.keys(approvalCriteria).length > 0 ? approvalCriteria : undefined,
    };
    try {
        await teamManager.spawnTeam(config);
        console.log(`\nTeam "${name}" created successfully!`);
        console.log(`Lead Provider: ${options.provider}${options.model ? ` (${options.model})` : ''}`);
        if (options.teammateProvider) {
            console.log(`Teammate Provider: ${options.teammateProvider}${options.teammateModel ? ` (${options.teammateModel})` : ''}`);
        }
        console.log(`Backend: ${options.backend}`);
        console.log(`Working directory: ${options.dir}`);
        if (Object.keys(approvalCriteria).length > 0) {
            console.log(`\nApproval Criteria:`);
            if (approvalCriteria.test) {
                console.log(`  - Tests: ${approvalCriteria.test.requireTests ? 'Required' : 'Optional'}`);
            }
            if (approvalCriteria.security) {
                console.log(`  - Security: Enabled (strict)`);
            }
            if (approvalCriteria.cost) {
                console.log(`  - Cost: Max tokens ${approvalCriteria.cost.maxTokens}, Max cost $${approvalCriteria.cost.maxCost}`);
            }
        }
    }
    catch (error) {
        console.error('Error creating team:', error);
    }
});
// List teams
program
    .command('list')
    .description('List all teams')
    .action(async () => {
    const teamManager = new TeamManager();
    const teams = await teamManager.discoverTeams();
    if (teams.length === 0) {
        console.log('No teams found. Create one with: llm-orchestrator create <name>');
    }
    else {
        console.log('Teams:');
        teams.forEach((team) => {
            console.log(`  - ${team.name} (${new Date(team.createdAt).toISOString()})`);
        });
    }
});
// Delete team
program
    .command('delete <name>')
    .description('Delete a team')
    .action(async (name) => {
    const teamManager = new TeamManager();
    try {
        await teamManager.shutdownTeam(name);
        console.log(`Team "${name}" deleted.`);
    }
    catch (error) {
        console.error('Error deleting team:', error);
    }
});
// List tmux sessions
program
    .command('tmux-list')
    .description('List all LLM Orchestrator tmux sessions')
    .action(async () => {
    const sessions = await listOrchestratorSessions();
    if (sessions.length === 0) {
        console.log('No LLM Orchestrator tmux sessions found.');
        console.log('Create one with: llm-orchestrator run <team-name> "<task>" --tmux');
    }
    else {
        console.log('LLM Orchestrator tmux sessions:');
        sessions.forEach(session => {
            console.log(`  - ${session}`);
            console.log(`    Attach:   tmux attach -t ${session}`);
            console.log(`    Kill:     tmux kill-session -t ${session}`);
        });
    }
});
// Kill tmux session
program
    .command('tmux-kill <session-name>')
    .description('Kill a specific tmux session')
    .action(async (sessionName) => {
    try {
        await killSession(sessionName);
        console.log(`tmux session "${sessionName}" killed.`);
    }
    catch (error) {
        console.error('Error killing tmux session:', error.message);
    }
});
// Run task
program
    .command('run <team-name>')
    .description('Run a task with a team')
    .argument('<task>', 'The task to execute')
    .option('-d, --dir <path>', 'Working directory', process.cwd())
    .option('-b, --backend <type>', 'Override communication backend (file, valkey)')
    .option('-u, --base-url <url>', 'Override base URL (for local providers)')
    .option('--tui', 'Launch TUI Dashboard for real-time monitoring')
    .option('--tmux', 'Launch TUI Dashboard in tmux session (deprecated: use --split-pane instead)')
    .option('--tmux-advanced', 'Launch TUI Dashboard in advanced tmux layout (deprecated: use --split-pane-advanced instead)')
    .option('--split-pane', 'Launch TUI Dashboard in horizontal split pane (TUI Dashboard | Agent Logs)')
    .option('--split-pane-advanced [count]', 'Launch TUI Dashboard in advanced split pane (Left: TUI, Right: N panes)', '3')
    .option('--debug', 'Enable debug mode for TUI')
    .option('--verbose', 'Enable verbose mode for TUI')
    .action(async (teamName, task, options) => {
    const teamManager = new TeamManager();
    const teamConfig = await teamManager.getTeamConfig(teamName);
    if (!teamConfig) {
        console.error(`Team "${teamName}" not found. Available teams:`);
        const teams = await teamManager.discoverTeams();
        teams.forEach(t => console.log(` - ${t.name}`));
        return;
    }
    // TUI Dashboard in tmux mode
    if (options.tmux) {
        try {
            console.warn('\n⚠️  --tmux is deprecated. Use --split-pane or --split-pane-advanced instead.\n');
            const tmuxAvailable = await isTmuxAvailable();
            if (!tmuxAvailable) {
                console.error('\n❌ tmux is not installed. Please install tmux first:');
                console.error('   macOS:   brew install tmux');
                console.error('   Linux:   sudo apt-get install tmux');
                console.error('   Windows: Use WSL with tmux\n');
                process.exit(1);
            }
            const tuiPath = path.join(process.cwd(), 'src', 'tui', 'index.tsx');
            const sessionName = `llm-orchestrator-${teamName}-${Date.now()}`;
            const logDir = path.join(process.env.HOME || '.', '.llm-orchestrator', teamName);
            const config = {
                sessionName,
                teamName,
                task,
                tuiPath,
                debug: options.debug,
                verbose: options.verbose,
                logDir
            };
            await createTuiSession(config);
            return;
        }
        catch (error) {
            console.error('\n❌ Failed to create tmux session:', error.message);
            console.log('\n💡 You can still use --tui option for standalone TUI Dashboard\n');
            process.exit(1);
        }
    }
    // Split pane mode
    if (options.splitPane || options.splitPaneAdvanced || options.tmuxAdvanced) {
        console.log('[DEBUG] Split pane mode triggered');
        try {
            const tmuxAvailable = await isTmuxAvailable();
            if (!tmuxAvailable) {
                console.error('\n❌ tmux is not installed. Please install tmux first:');
                console.error('   macOS:   brew install tmux');
                console.error('   Linux:   sudo apt-get install tmux');
                console.error('   Windows: Use WSL with tmux\n');
                process.exit(1);
            }
            const tuiPath = path.join(process.cwd(), 'src', 'tui', 'index.tsx');
            const sessionName = `llm-orchestrator-${teamName}-${Date.now()}`;
            const logDir = path.join(process.env.HOME || '.', '.llm-orchestrator', teamName);
            // Parse right pane count from --split-pane-advanced option
            let rightPaneCount = 3; // Default to 3 panes
            if (options.splitPaneAdvanced) {
                const count = parseInt(options.splitPaneAdvanced, 10);
                if (!isNaN(count) && count >= 2 && count <= 6) {
                    rightPaneCount = count;
                }
            }
            else if (options.tmuxAdvanced) {
                const count = parseInt(options.tmuxAdvanced, 10);
                if (!isNaN(count) && count >= 2 && count <= 6) {
                    rightPaneCount = count;
                }
            }
            console.log(`[DEBUG] rightPaneCount: ${rightPaneCount}`);
            console.log(`[DEBUG] About to call createAdvancedSession...`);
            const config = {
                sessionName,
                teamName,
                task,
                tuiPath,
                debug: options.debug,
                verbose: options.verbose,
                logDir,
                rightPaneCount
            };
            await createAdvancedSession(config);
            console.log(`[DEBUG] createAdvancedSession completed`);
            return;
        }
        catch (error) {
            console.error('\n❌ Failed to create tmux session:', error.message);
            console.log('\n💡 You can still use --tui option for standalone TUI Dashboard\n');
            process.exit(1);
        }
    }
    // TUI Dashboard モードの場合
    if (options.tui) {
        const { spawn } = await import('child_process');
        // プロジェクトルートディレクトリからTUIを実行
        const tuiPath = path.join(process.cwd(), 'src', 'tui', 'index.tsx');
        const args = ['tsx', tuiPath, '--team', teamName, '--task', task];
        if (options.debug) {
            args.push('--debug');
        }
        if (options.verbose) {
            args.push('--verbose');
        }
        console.log(`\n🚀 Launching TUI Dashboard for team "${teamName}"`);
        console.log(`📋 Task: ${task}\n`);
        const tui = spawn('npx', args, {
            stdio: 'inherit',
            shell: true
        });
        tui.on('exit', (code) => {
            process.exit(code ?? 0);
        });
        return;
    }
    // 通常モード
    // バックエンドの決定（オプション優先、次に設定ファイル、デフォルト）
    const backendType = options.backend || teamConfig.backend || 'file';
    const backend = createBackend({
        type: backendType,
        teamName,
        basePath: path.join(process.env.HOME || '.', '.llm-orchestrator'),
    });
    console.log(`Running task with team "${teamName}":`);
    console.log(`  Task: ${task}`);
    console.log(`  Provider: ${teamConfig.leadProvider.type}`);
    console.log(`  Backend: ${backendType}`);
    console.log(`  Working dir: ${options.dir}`);
    if (options.baseUrl) {
        console.log(`  Base URL: ${options.baseUrl}`);
    }
    console.log('');
    // オプションの baseURL を使用して設定を上書き
    if (options.baseUrl && (teamConfig.leadProvider.type === 'ollama' ||
        teamConfig.leadProvider.type === 'lmstudio' ||
        teamConfig.leadProvider.type === 'llama-server')) {
        teamConfig.leadProvider.baseURL = options.baseUrl;
    }
    // バックエンドを初期化
    await backend.initialize();
    // Lead エージェントを起動
    const leadAgent = new LeadAgent({
        teamName,
        teamConfig,
        workingDir: options.dir,
        backend,
    });
    try {
        await leadAgent.start();
        // タスクを Lead に送信
        await backend.writeMessage('lead', {
            id: `msg_${Date.now()}`,
            from: 'user',
            to: 'lead',
            type: 'command',
            content: { task },
            timestamp: Date.now(),
            status: 'delivered',
        });
        // インタラクティブモード（将来的な実装）
        console.log('\n[Interactive mode - Type "exit" to quit]');
        console.log('Press Ctrl+C to stop.\n');
        // 簡易的な終了待ち
        await new Promise((resolve) => {
            process.on('SIGINT', async () => {
                console.log('\n\nStopping...');
                await leadAgent.stop();
                process.exit(0);
            });
        });
    }
    catch (error) {
        console.error('Error:', error);
        await leadAgent.stop();
    }
});
// Test provider
program
    .command('test-provider <type>')
    .description('Test a provider connection')
    .option('-m, --model <name>', 'Model name')
    .option('-k, --api-key <key>', 'API key (for cloud providers)')
    .option('-u, --base-url <url>', 'Base URL (for local providers)')
    .action(async (type, options) => {
    try {
        console.log(`Testing provider: ${type}`);
        if (options.model)
            console.log(`Model: ${options.model}`);
        if (options.baseUrl)
            console.log(`Base URL: ${options.baseUrl}`);
        const provider = createProvider({
            type: type,
            model: options.model,
            apiKey: options.apiKey,
            baseURL: options.baseUrl,
        });
        const response = await provider.chat({
            messages: [{ role: 'user', content: 'Hello!' }],
        });
        console.log('\n✅ Provider test successful!');
        console.log(`Response: ${response.message.content}`);
        console.log(`Tokens used: ${response.usage.totalTokens}`);
    }
    catch (error) {
        console.error('\n❌ Provider test failed:', error.message);
        process.exit(1);
    }
});
// TUI Dashboard (Demo)
program
    .command('tui')
    .description('Launch TUI Dashboard')
    .option('-d, --debug', 'Enable debug mode with verbose logging')
    .option('-v, --verbose', 'Show verbose output')
    .option('--team <name>', 'Team name to monitor')
    .option('--task <description>', 'Task description (required with --team)')
    .action(async (options) => {
    const { spawn } = await import('child_process');
    const tuiPath = path.join(__dirname, '..', 'tui', 'index.tsx');
    const args = ['tsx', tuiPath];
    if (options.debug) {
        args.push('--debug');
    }
    if (options.verbose) {
        args.push('--verbose');
    }
    if (options.team) {
        args.push('--team', options.team);
    }
    if (options.task) {
        args.push('--task', options.task);
    }
    const tui = spawn('npx', args, {
        stdio: 'inherit',
        shell: true
    });
    tui.on('exit', (code) => {
        process.exit(code ?? 0);
    });
});
program.parse();
//# sourceMappingURL=cli.js.map