#!/usr/bin/env node

/**
 * Test suite for dependency management system
 */

import { DependencyManager, TaskStatus } from '../dist/dependencies/index.js';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function printSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function printError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function printInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function printWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

// Test counter
let passed = 0;
let failed = 0;

async function runTest(name, testFn) {
  try {
    await testFn();
    passed++;
    printSuccess(name);
  } catch (error) {
    failed++;
    printError(`${name}: ${error.message}`);
    console.error(error.stack);
  }
}

// Test 1: Dependency manager initialization
await runTest('Dependency manager initializes correctly', () => {
  const manager = new DependencyManager();
  if (manager.getTotalSubtasks() !== 0) {
    throw new Error('Expected 0 subtasks after initialization');
  }
});

// Test 2: Add single subtask
await runTest('Add single subtask without dependencies', () => {
  const manager = new DependencyManager();
  manager.addSubtask({
    id: 'task1',
    description: 'First task',
    dependencies: [],
    status: TaskStatus.PENDING
  });

  if (manager.getTotalSubtasks() !== 1) {
    throw new Error('Expected 1 subtask');
  }

  const status = manager.getSubtaskStatus('task1');
  if (!status || status.id !== 'task1') {
    throw new Error('Subtask not found correctly');
  }
});

// Test 3: Add subtasks with dependencies
await runTest('Add subtasks with dependencies', () => {
  const manager = new DependencyManager();
  manager.addSubtask({
    id: 'task1',
    description: 'First task',
    dependencies: [],
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task2',
    description: 'Second task depends on task1',
    dependencies: ['task1'],
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task3',
    description: 'Third task depends on task1 and task2',
    dependencies: ['task1', 'task2'],
    status: TaskStatus.PENDING
  });

  if (manager.getTotalSubtasks() !== 3) {
    throw new Error('Expected 3 subtasks');
  }
});

// Test 4: Get execution order
await runTest('Get correct execution order', () => {
  const manager = new DependencyManager();
  manager.addSubtask({
    id: 'task1',
    description: 'First task',
    dependencies: [],
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task2',
    description: 'Second task',
    dependencies: ['task1'],
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task3',
    description: 'Third task',
    dependencies: ['task1', 'task2'],
    status: TaskStatus.PENDING
  });

  const order = manager.getExecutionOrder();
  if (order[0] !== 'task1') {
    throw new Error('Expected task1 first');
  }
  if (order[1] !== 'task2') {
    throw new Error('Expected task2 second');
  }
  if (order[2] !== 'task3') {
    throw new Error('Expected task3 third');
  }
});

// Test 5: Get parallel execution levels
await runTest('Get parallel execution levels', () => {
  const manager = new DependencyManager();

  // task1 and task2 can run in parallel
  manager.addSubtask({
    id: 'task1',
    description: 'First task',
    dependencies: [],
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task2',
    description: 'Second task',
    dependencies: [],
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task3',
    description: 'Third task depends on task1 and task2',
    dependencies: ['task1', 'task2'],
    status: TaskStatus.PENDING
  });

  const levels = manager.getParallelLevels();

  if (levels.length !== 2) {
    throw new Error(`Expected 2 levels, got ${levels.length}`);
  }

  // First level should have task1 and task2
  if (levels[0].length !== 2 || !levels[0].includes('task1') || !levels[0].includes('task2')) {
    throw new Error('First level should have task1 and task2');
  }

  // Second level should have task3
  if (levels[1].length !== 1 || levels[1][0] !== 'task3') {
    throw new Error('Second level should have task3');
  }
});

// Test 6: Detect cycles
await runTest('Detect cycles in dependency graph', () => {
  const manager = new DependencyManager();
  manager.addSubtask({
    id: 'task1',
    description: 'First task',
    dependencies: ['task2'],  // task1 depends on task2
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task2',
    description: 'Second task',
    dependencies: ['task3'],  // task2 depends on task3
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task3',
    description: 'Third task',
    dependencies: ['task1'],  // task3 depends on task1 (cycle!)
    status: TaskStatus.PENDING
  });

  const cycleResult = manager.detectCycle();

  if (!cycleResult.hasCycle) {
    throw new Error('Expected to detect cycle');
  }

  if (!cycleResult.cycle || cycleResult.cycle.length !== 3) {
    throw new Error('Expected cycle with 3 nodes');
  }
});

// Test 7: Get ready subtasks
await runTest('Get ready subtasks (dependencies completed)', () => {
  const manager = new DependencyManager();
  manager.addSubtask({
    id: 'task1',
    description: 'First task',
    dependencies: [],
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task2',
    description: 'Second task',
    dependencies: ['task1'],
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task3',
    description: 'Third task',
    dependencies: [],
    status: TaskStatus.PENDING
  });

  // Initially, only task1 and task3 are ready
  let ready = manager.getReadySubtasks();
  if (ready.length !== 2) {
    throw new Error(`Expected 2 ready subtasks, got ${ready.length}`);
  }

  // Complete task1
  manager.markCompleted('task1');

  // Now task2 should also be ready
  ready = manager.getReadySubtasks();
  if (ready.length !== 2) {
    throw new Error(`Expected 2 ready subtasks after task1 completion, got ${ready.length}`);
  }

  // Check if task2 is in ready list
  if (!ready.some(s => s.id === 'task2')) {
    throw new Error('task2 should be ready after task1 completed');
  }
});

// Test 8: Update status and track progress
await runTest('Update status and track progress', () => {
  const manager = new DependencyManager();

  manager.addSubtask({
    id: 'task1',
    description: 'First task',
    dependencies: [],
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task2',
    description: 'Second task',
    dependencies: [],
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task3',
    description: 'Third task',
    dependencies: [],
    status: TaskStatus.PENDING
  });

  let summary = manager.getExecutionSummary();
  if (summary.total !== 3 || summary.completed !== 0 || summary.percentage !== 0) {
    throw new Error('Initial summary incorrect');
  }

  manager.markCompleted('task1');
  summary = manager.getExecutionSummary();
  if (summary.completed !== 1 || summary.percentage !== 33) {
    throw new Error('Summary after 1 task completion incorrect');
  }

  manager.markCompleted('task2');
  manager.markCompleted('task3');
  summary = manager.getExecutionSummary();
  if (!manager.isAllCompleted() || summary.percentage !== 100) {
    throw new Error('Final summary incorrect');
  }
});

// Test 9: Get dependents
await runTest('Get dependents of a subtask', () => {
  const manager = new DependencyManager();

  manager.addSubtask({
    id: 'task1',
    description: 'First task',
    dependencies: [],
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task2',
    description: 'Second task depends on task1',
    dependencies: ['task1'],
    status: TaskStatus.PENDING
  });

  manager.addSubtask({
    id: 'task3',
    description: 'Third task depends on task1',
    dependencies: ['task1'],
    status: TaskStatus.PENDING
  });

  const dependents = manager.getDependents('task1');
  if (dependents.length !== 2) {
    throw new Error('Expected 2 dependents');
  }

  if (!dependents.includes('task2') || !dependents.includes('task3')) {
    throw new Error('Expected task2 and task3 as dependents');
  }
});

// Test 10: Clear all subtasks
await runTest('Clear all subtasks', () => {
  const manager = new DependencyManager();

  manager.addSubtask({
    id: 'task1',
    description: 'First task',
    dependencies: [],
    status: TaskStatus.PENDING
  });

  if (manager.getTotalSubtasks() !== 1) {
    throw new Error('Expected 1 subtask before clear');
  }

  manager.clear();

  if (manager.getTotalSubtasks() !== 0) {
    throw new Error('Expected 0 subtasks after clear');
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Dependency Management Tests: ${passed}/${passed + failed} passed`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}
