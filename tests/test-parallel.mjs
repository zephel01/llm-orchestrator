// Parallel execution tests

import { TeammateAgent } from '../dist/agents/index.js';
import { AgentManager } from '../dist/agents/index.js';
import { createBackend } from '../dist/communication/index.js';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
};

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.red}Error:${colors.reset} ${error.message}`);
  }
}

// Message インターフェースを定義
const createMessage = (id, from, to, type, content, status = 'delivered') => ({
  id,
  from,
  to,
  type,
  content,
  timestamp: Date.now(),
  status,
});

async function runTests() {
  console.log(`${colors.blue}Running Parallel Execution Tests...${colors.reset}\n`);

  // テスト用のバックエンドを作成
  const backend = createBackend({
    type: 'file',
    teamName: 'test-parallel-team',
    basePath: '.llm-orchestrator-test',
  });

  await backend.initialize();

  // Test 1: Teammate Agent 基本機能
  await test('TeammateAgent starts and processes messages', async () => {
    const teammateConfig = {
      agentId: 'teammate-test-1',
      teamName: 'test-parallel-team',
      provider: {
        type: 'ollama', // Ollama はローカルなのでテストしやすい
      },
      workingDir: process.cwd(),
      backend: backend,
    };

    const teammate = new TeammateAgent(teammateConfig);
    await teammate.start();

    // メッセージを送信
    const testMessage = createMessage(
      'msg-test-1',
      'lead',
      'teammate-test-1',
      'command',
      { task: 'Write a simple test file' }
    );

    await backend.writeMessage('teammate-test-1', testMessage);

    // 少し待機してメッセージが処理されるのを待つ
    await new Promise(resolve => setTimeout(resolve, 2000));

    await teammate.stop();
  });

  // Test 2: AgentManager creates teammate
  await test('AgentManager spawns a new teammate', async () => {
    const agentManager = new AgentManager('test-parallel-team', backend);

    const agentInfo = await agentManager.spawnTeammate({
      provider: {
        type: 'ollama',
      },
      workingDir: process.cwd(),
    });

    if (!agentInfo || !agentInfo.id) {
      throw new Error('Failed to spawn teammate');
    }

    if (agentInfo.type !== 'teammate') {
      throw new Error('Agent type should be teammate');
    }

    await agentManager.stopAllAgents();
  });

  // Test 3: AgentManager assigns subtask
  await test('AgentManager assigns subtask to agent', async () => {
    const agentManager = new AgentManager('test-parallel-team', backend);

    // チームメイトを生成
    const agentInfo = await agentManager.spawnTeammate({
      provider: {
        type: 'ollama',
      },
      workingDir: process.cwd(),
    });

    // サブタスクを割り当て
    const subtaskId = 'subtask-test-1';
    await agentManager.assignSubtask(subtaskId, 'Test task', agentInfo.id);

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));

    const subtask = agentManager.getSubtask(subtaskId);
    if (!subtask) {
      throw new Error('Subtask not found');
    }

    if (subtask.assignedTo !== agentInfo.id) {
      throw new Error('Subtask not assigned correctly');
    }

    await agentManager.stopAllAgents();
  });

  // Test 4: AgentManager tracks multiple agents
  await test('AgentManager tracks multiple agents', async () => {
    const agentManager = new AgentManager('test-parallel-team', backend);

    // 複数のチームメイトを生成
    const agent1 = await agentManager.spawnTeammate({
      provider: { type: 'ollama' },
      workingDir: process.cwd(),
    });

    const agent2 = await agentManager.spawnTeammate({
      provider: { type: 'ollama' },
      workingDir: process.cwd(),
    });

    const activeAgents = agentManager.getActiveAgents();
    if (activeAgents.length !== 2) {
      throw new Error(`Expected 2 active agents, got ${activeAgents.length}`);
    }

    await agentManager.stopAllAgents();
  });

  // Test 5: AgentManager finds idle agent
  await test('AgentManager finds idle agent', async () => {
    const agentManager = new AgentManager('test-parallel-team', backend);

    const agent1 = await agentManager.spawnTeammate({
      provider: { type: 'ollama' },
      workingDir: process.cwd(),
    });

    const idleAgentId = agentManager.findIdleAgent();
    if (idleAgentId !== agent1.id) {
      throw new Error('Should find the idle agent');
    }

    await agentManager.stopAllAgents();
  });

  // Test 6: AgentManager records subtask result
  await test('AgentManager records subtask result', async () => {
    const agentManager = new AgentManager('test-parallel-team', backend);

    // サブタスクを先に作成（エージェントを生成して割り当て）
    const agent = await agentManager.spawnTeammate({
      provider: { type: 'ollama' },
      workingDir: process.cwd(),
    });

    const subtaskId = 'subtask-result-test';
    await agentManager.assignSubtask(subtaskId, 'Test task', agent.id);

    const result = { success: true, message: 'Task completed' };
    agentManager.recordSubtaskResult(subtaskId, result);

    const subtask = agentManager.getSubtask(subtaskId);
    if (!subtask) {
      throw new Error('Subtask not found');
    }

    if (subtask.status !== 'completed') {
      throw new Error('Subtask status should be completed');
    }

    if (!subtask.completedAt) {
      throw new Error('Subtask should have completion time');
    }

    await agentManager.stopAllAgents();
  });

  // Test 7: AgentManager statistics
  await test('AgentManager provides statistics', async () => {
    const agentManager = new AgentManager('test-parallel-team', backend);

    const stats = agentManager.getStats();

    if (typeof stats.activeAgents !== 'number') {
      throw new Error('Stats should include activeAgents count');
    }

    if (typeof stats.subtasks !== 'object') {
      throw new Error('Stats should include subtasks info');
    }

    // エージェントを生成して統計が更新されるか確認
    await agentManager.spawnTeammate({
      provider: { type: 'ollama' },
      workingDir: process.cwd(),
    });

    const updatedStats = agentManager.getStats();
    if (updatedStats.activeAgents !== 1) {
      throw new Error('Active agents count should be 1');
    }

    await agentManager.stopAllAgents();
  });

  // Test 8: Parallel subtask assignment
  await test('AgentManager assigns subtasks in parallel', async () => {
    const agentManager = new AgentManager('test-parallel-team', backend);

    // 複数のエージェントを生成
    const agent1 = await agentManager.spawnTeammate({
      provider: { type: 'ollama' },
      workingDir: process.cwd(),
    });

    const agent2 = await agentManager.spawnTeammate({
      provider: { type: 'ollama' },
      workingDir: process.cwd(),
    });

    // 並列でサブタスクを割り当て
    await Promise.all([
      agentManager.assignSubtask('subtask-parallel-1', 'Task 1', agent1.id),
      agentManager.assignSubtask('subtask-parallel-2', 'Task 2', agent2.id),
    ]);

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));

    const subtasks = agentManager.getSubtasks();
    if (subtasks.length !== 2) {
      throw new Error(`Expected 2 subtasks, got ${subtasks.length}`);
    }

    await agentManager.stopAllAgents();
  });

  // Test 9: Backend factory creates file backend for parallel execution
  await test('Backend factory supports parallel execution', async () => {
    const backend = createBackend({
      type: 'file',
      teamName: 'parallel-test-team',
    });

    await backend.initialize();

    // メッセージをクリア
    await backend.clearMessages('teammate-1');

    const testMessage = createMessage(
      'factory-parallel-test-1',
      'lead',
      'teammate-1',
      'command',
      { task: 'Test task' }
    );

    await backend.writeMessage('teammate-1', testMessage);
    const messages = await backend.readMessages('teammate-1');

    await backend.close();

    if (messages.length !== 1) {
      throw new Error(`Expected 1 message, got ${messages.length}`);
    }
  });

  // Test 10: Stop individual agent
  await test('AgentManager stops individual agent', async () => {
    const agentManager = new AgentManager('test-parallel-team', backend);

    const agent1 = await agentManager.spawnTeammate({
      provider: { type: 'ollama' },
      workingDir: process.cwd(),
    });

    const agent2 = await agentManager.spawnTeammate({
      provider: { type: 'ollama' },
      workingDir: process.cwd(),
    });

    // 1つのエージェントを停止
    await agentManager.stopAgent(agent1.id);

    const activeAgents = agentManager.getActiveAgents();
    if (activeAgents.length !== 1) {
      throw new Error(`Expected 1 active agent, got ${activeAgents.length}`);
    }

    if (activeAgents[0].id !== agent2.id) {
      throw new Error('Wrong agent is still active');
    }

    await agentManager.stopAllAgents();
  });

  await backend.close();

  console.log(`\n${colors.blue}Results:${colors.reset}`);
  console.log(`${colors.green}Passed:${colors.reset} ${passed}`);
  console.log(`${colors.red}Failed:${colors.reset} ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
