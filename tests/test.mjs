// Simple unit tests for agent-team

import { createProvider } from '../dist/providers/index.js';
import { TeamManager } from '../dist/team-manager/index.js';
import { FileCommunicationBus } from '../dist/communication/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let passed = 0;
let failed = 0;
const testResults = [];

function test(name, fn) {
  testResults.push({ name, fn, passed: false, error: null });
}

async function runTests() {
  console.log(`${colors.blue}Running Agent Team Tests...${colors.reset}\n`);

  for (const t of testResults) {
    try {
      await t.fn();
      t.passed = true;
      passed++;
      console.log(`${colors.green}✓${colors.reset} ${t.name}`);
    } catch (error) {
      failed++;
      t.error = error;
      console.log(`${colors.red}✗${colors.reset} ${t.name}`);
      console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
    }
  }

  console.log(`\n${colors.blue}Results:${colors.reset}`);
  console.log(`${colors.green}Passed:${colors.reset} ${passed}`);
  console.log(`${colors.red}Failed:${colors.reset} ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Test 1: Provider factory creates correct provider
test('Provider factory creates Anthropic provider', () => {
  const provider = createProvider({ type: 'anthropic' });
  if (provider.name !== 'anthropic') {
    throw new Error(`Expected provider name 'anthropic', got '${provider.name}'`);
  }
});

test('Provider factory creates OpenAI provider', () => {
  const provider = createProvider({ type: 'openai' });
  if (provider.name !== 'openai') {
    throw new Error(`Expected provider name 'openai', got '${provider.name}'`);
  }
});

test('Provider factory creates Ollama provider', () => {
  const provider = createProvider({ type: 'ollama' });
  if (provider.name !== 'ollama') {
    throw new Error(`Expected provider name 'ollama', got '${provider.name}'`);
  }
});

test('Provider factory throws on unknown provider', () => {
  try {
    createProvider({ type: 'unknown' });
    throw new Error('Should have thrown an error');
  } catch (error) {
    if (!error.message.includes('Unknown provider type')) {
      throw new Error('Wrong error message');
    }
  }
});

// Test 2: TeamManager initialization
test('TeamManager initializes global directory', async () => {
  const manager = new TeamManager();
  await manager.initializeGlobal();

  const agentTeamDir = path.join(process.env.HOME || '.', '.llm-orchestrator');
  const teamsDir = path.join(agentTeamDir, 'teams');
  const locksDir = path.join(agentTeamDir, 'locks');

  const teamsExists = await fs.access(teamsDir).then(() => true).catch(() => false);
  const locksExists = await fs.access(locksDir).then(() => true).catch(() => false);

  if (!teamsExists) {
    throw new Error('Teams directory not created');
  }
  if (!locksExists) {
    throw new Error('Locks directory not created');
  }
});

// Test 3: Team creation and deletion
test('TeamManager creates team', async () => {
  const manager = new TeamManager();
  const teamName = 'test-team-unit';
  const config = {
    name: teamName,
    createdAt: Date.now(),
    leadProvider: { type: 'anthropic' },
    uiMode: 'inline',
  };

  await manager.spawnTeam(config);

  const teamConfig = await manager.getTeamConfig(teamName);
  if (!teamConfig) {
    throw new Error('Team config not found');
  }
  if (teamConfig.name !== teamName) {
    throw new Error(`Expected team name '${teamName}', got '${teamConfig.name}'`);
  }

  // Cleanup
  await manager.shutdownTeam(teamName);
});

test('TeamManager lists teams', async () => {
  const manager = new TeamManager();
  const teamName = 'test-team-list';
  const config = {
    name: teamName,
    createdAt: Date.now(),
    leadProvider: { type: 'anthropic' },
    uiMode: 'inline',
  };

  await manager.spawnTeam(config);

  const teams = await manager.discoverTeams();
  const found = teams.find(t => t.name === teamName);

  if (!found) {
    throw new Error('Team not found in list');
  }

  // Cleanup
  await manager.shutdownTeam(teamName);
});

test('TeamManager deletes team', async () => {
  const manager = new TeamManager();
  const teamName = 'test-team-delete';
  const config = {
    name: teamName,
    createdAt: Date.now(),
    leadProvider: { type: 'anthropic' },
    uiMode: 'inline',
  };

  await manager.spawnTeam(config);
  await manager.shutdownTeam(teamName);

  const teamConfig = await manager.getTeamConfig(teamName);
  if (teamConfig !== null) {
    throw new Error('Team config still exists after deletion');
  }
});

// Test 4: Communication Bus (file-based)
test('FileCommunicationBus writes and reads messages', async () => {
  const bus = new FileCommunicationBus('test-bus');
  await bus.initialize();

  const testMessage = {
    id: 'test-msg-1',
    from: 'sender',
    to: 'receiver',
    type: 'command',
    content: { task: 'test task' },
    timestamp: Date.now(),
    status: 'delivered',
  };

  await bus.write('receiver', testMessage);
  const messages = await bus.read('receiver');

  if (messages.length !== 1) {
    throw new Error(`Expected 1 message, got ${messages.length}`);
  }
  if (messages[0].id !== testMessage.id) {
    throw new Error('Message ID mismatch');
  }

  // Cleanup
  await bus.clear('receiver');
  await fs.rm(path.join(process.env.HOME || '.', '.llm-orchestrator', 'teams', 'test-bus'), { recursive: true, force: true });
});

test('FileCommunicationBus handles multiple messages', async () => {
  const bus = new FileCommunicationBus('test-bus-multi');
  await bus.initialize();

  const messages = [
    {
      id: 'test-msg-1',
      from: 'sender',
      to: 'receiver',
      type: 'command',
      content: { task: 'task 1' },
      timestamp: Date.now(),
      status: 'delivered',
    },
    {
      id: 'test-msg-2',
      from: 'sender',
      to: 'receiver',
      type: 'command',
      content: { task: 'task 2' },
      timestamp: Date.now() + 1,
      status: 'delivered',
    },
  ];

  for (const msg of messages) {
    await bus.write('receiver', msg);
  }

  const readMessages = await bus.read('receiver');

  if (readMessages.length !== 2) {
    throw new Error(`Expected 2 messages, got ${readMessages.length}`);
  }

  // Cleanup
  await bus.clear('receiver');
  await fs.rm(path.join(process.env.HOME || '.', '.llm-orchestrator', 'teams', 'test-bus-multi'), { recursive: true, force: true });
});

// Test 5: Lock mechanism
test('FileCommunicationBus acquires and releases lock', async () => {
  const bus = new FileCommunicationBus('test-lock-unique');
  await bus.initialize();

  const resource = 'test-resource-unique';
  const agentId = 'agent-1-unique';

  const acquired = await bus.acquireLock(resource, agentId);
  if (!acquired) {
    throw new Error('Failed to acquire lock');
  }

  const acquiredAgain = await bus.acquireLock(resource, agentId);
  if (acquiredAgain) {
    throw new Error('Should not acquire lock twice');
  }

  await bus.releaseLock(resource, agentId);
  const acquiredAfterRelease = await bus.acquireLock(resource, agentId);
  if (!acquiredAfterRelease) {
    throw new Error('Failed to acquire lock after release');
  }

  // Cleanup
  await fs.rm(path.join(process.env.HOME || '.', '.llm-orchestrator', 'teams', 'test-lock-unique'), { recursive: true, force: true });
});

// Run all tests
runTests();
