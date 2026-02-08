// CLI エントリーポイント

import { Command } from 'commander';
import { TeamManager } from './team-manager/index.js';
import { LeadAgent } from './agents/lead.js';
import { createProvider } from './providers/index.js';
import { spawn } from 'child_process';
import * as path from 'path';

const program = new Command();

program
  .name('llm-orchestrator')
  .description('Multi-agent system for autonomous task execution')
  .version('0.1.0');

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
  .option('-p, --provider <type>', 'LLM provider (anthropic, openai, ollama)', 'anthropic')
  .option('-m, --model <name>', 'Model name')
  .option('-d, --dir <path>', 'Working directory', process.cwd())
  .action(async (name, options) => {
    const teamManager = new TeamManager();

    const config = {
      name,
      createdAt: Date.now(),
      leadProvider: {
        type: options.provider,
        model: options.model,
      },
      uiMode: 'inline' as const,
    };

    try {
      await teamManager.spawnTeam(config);
      console.log(`\nTeam "${name}" created successfully!`);
      console.log(`Provider: ${options.provider}${options.model ? ` (${options.model})` : ''}`);
      console.log(`Working directory: ${options.dir}`);
    } catch (error) {
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
    } else {
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
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  });

// Run task
program
  .command('run <team-name>')
  .description('Run a task with a team')
  .argument('<task>', 'The task to execute')
  .option('-d, --dir <path>', 'Working directory', process.cwd())
  .action(async (teamName, task, options) => {
    const teamManager = new TeamManager();
    const teamConfig = await teamManager.getTeamConfig(teamName);

    if (!teamConfig) {
      console.error(`Team "${teamName}" not found. Available teams:`);
      const teams = await teamManager.discoverTeams();
      teams.forEach(t => console.log(`  - ${t.name}`));
      return;
    }

    console.log(`Running task with team "${teamName}":`);
    console.log(`  Task: ${task}`);
    console.log(`  Provider: ${teamConfig.leadProvider.type}`);
    console.log(`  Working dir: ${options.dir}`);
    console.log('');

    // Lead エージェントを起動
    const leadAgent = new LeadAgent({
      teamName,
      teamConfig,
      workingDir: options.dir,
    });

    try {
      await leadAgent.start();

      // タスクを Lead に送信
      const { FileCommunicationBus } = await import('./communication/index.js');
      const commBus = new FileCommunicationBus(teamName);
      await commBus.initialize();

      await commBus.write('lead', {
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
    } catch (error) {
      console.error('Error:', error);
      await leadAgent.stop();
    }
  });

// Test provider
program
  .command('test-provider <type>')
  .description('Test if a provider is working')
  .option('-m, --model <name>', 'Model name')
  .action(async (type, options) => {
    try {
      const provider = createProvider({ type, model: options.model });

      console.log(`Testing provider: ${type}...`);
      const response = await provider.chat({
        messages: [{ role: 'user', content: 'Hello! Please respond with just "OK".' }],
        maxTokens: 10,
      });

      console.log('Response:', response.message);
      console.log('Usage:', response.usage);
      console.log('✅ Provider is working!');
    } catch (error) {
      console.error('❌ Provider test failed:', error);
    }
  });

program.parse();
