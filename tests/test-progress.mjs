#!/usr/bin/env node

/**
 * Test suite for progress tracking system
 */

import { ProgressTracker, TaskStatus, ProgressFormatterFactory } from '../dist/progress/index.js';

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

// Test 1: Progress tracker initialization
await runTest('Progress tracker initializes correctly', () => {
  const tracker = new ProgressTracker();
  const state = tracker.getState();

  if (state.totalSubtasks !== 0) {
    throw new Error('Expected 0 subtasks after initialization');
  }

  if (state.progressPercentage !== 0) {
    throw new Error('Expected 0% progress after initialization');
  }
});

// Test 2: Add subtask
await runTest('Add a subtask', () => {
  const tracker = new ProgressTracker();

  tracker.addSubtask({
    id: 'task1',
    description: 'First task',
    status: TaskStatus.PENDING
  });

  const state = tracker.getState();

  if (state.totalSubtasks !== 1) {
    throw new Error('Expected 1 subtask');
  }

  if (state.waitingSubtasks !== 1) {
    throw new Error('Expected 1 waiting subtask');
  }
});

// Test 3: Update subtask status
await runTest('Update subtask status', () => {
  const tracker = new ProgressTracker();

  tracker.addSubtask({
    id: 'task1',
    description: 'First task',
    status: TaskStatus.PENDING
  });

  tracker.setSubtaskStatus('task1', TaskStatus.IN_PROGRESS);

  const state = tracker.getState();

  if (state.inProgressSubtasks !== 1) {
    throw new Error('Expected 1 in-progress subtask');
  }

  if (state.waitingSubtasks !== 0) {
    throw new Error('Expected 0 waiting subtasks');
  }
});

// Test 4: Update subtask progress
await runTest('Update subtask progress', () => {
  const tracker = new ProgressTracker();

  tracker.addSubtask({
    id: 'task1',
    description: 'First task',
    status: TaskStatus.IN_PROGRESS
  });

  tracker.setSubtaskProgress('task1', 50);

  const subtask = tracker.getSubtask('task1');

  if (!subtask || subtask.progress !== 50) {
    throw new Error('Expected progress to be 50');
  }
});

// Test 5: Calculate progress percentage
await runTest('Calculate progress percentage', () => {
  const tracker = new ProgressTracker();

  tracker.addSubtask({
    id: 'task1',
    description: 'First task',
    status: TaskStatus.PENDING
  });

  tracker.addSubtask({
    id: 'task2',
    description: 'Second task',
    status: TaskStatus.PENDING
  });

  tracker.addSubtask({
    id: 'task3',
    description: 'Third task',
    status: TaskStatus.PENDING
  });

  // Complete one task
  tracker.setSubtaskStatus('task1', TaskStatus.COMPLETED);

  let state = tracker.getState();
  if (state.progressPercentage !== 33) {
    throw new Error(`Expected 33% progress, got ${state.progressPercentage}%`);
  }

  // Complete second task
  tracker.setSubtaskStatus('task2', TaskStatus.COMPLETED);

  state = tracker.getState();
  if (state.progressPercentage !== 67) {
    throw new Error(`Expected 67% progress, got ${state.progressPercentage}%`);
  }

  // Complete third task
  tracker.setSubtaskStatus('task3', TaskStatus.COMPLETED);

  state = tracker.getState();
  if (state.progressPercentage !== 100) {
    throw new Error(`Expected 100% progress, got ${state.progressPercentage}%`);
  }
});

// Test 6: Set active agents
await runTest('Set active agents count', () => {
  const tracker = new ProgressTracker();

  tracker.setActiveAgents(5);

  const state = tracker.getState();

  if (state.activeAgents !== 5) {
    throw new Error('Expected 5 active agents');
  }
});

// Test 7: Check if all completed
await runTest('Check if all subtasks are completed', () => {
  const tracker = new ProgressTracker();

  tracker.addSubtask({
    id: 'task1',
    description: 'First task',
    status: TaskStatus.PENDING
  });

  tracker.addSubtask({
    id: 'task2',
    description: 'Second task',
    status: TaskStatus.PENDING
  });

  if (tracker.isAllCompleted()) {
    throw new Error('Expected not all completed');
  }

  tracker.setSubtaskStatus('task1', TaskStatus.COMPLETED);

  if (tracker.isAllCompleted()) {
    throw new Error('Expected not all completed after one task');
  }

  tracker.setSubtaskStatus('task2', TaskStatus.COMPLETED);

  if (!tracker.isAllCompleted()) {
    throw new Error('Expected all completed');
  }
});

// Test 8: Inline formatter
await runTest('Inline formatter produces valid output', () => {
  const tracker = new ProgressTracker();

  tracker.addSubtask({
    id: 'task1',
    description: 'First task',
    status: TaskStatus.COMPLETED
  });

  tracker.addSubtask({
    id: 'task2',
    description: 'Second task',
    status: TaskStatus.IN_PROGRESS
  });

  const state = tracker.getState();
  const formatter = ProgressFormatterFactory.create('inline');
  const output = formatter.format(state);

  if (!output.includes('50%')) {
    throw new Error('Expected output to contain 50%');
  }

  if (!output.includes('Active Agents')) {
    throw new Error('Expected output to contain "Active Agents"');
  }

  if (!output.includes('✅')) {
    throw new Error('Expected output to contain success icon');
  }

  if (!output.includes('🔄')) {
    throw new Error('Expected output to contain in-progress icon');
  }
});

// Test 9: Progress bar formatter
await runTest('Progress bar formatter produces valid output', () => {
  const tracker = new ProgressTracker();

  tracker.addSubtask({
    id: 'task1',
    description: 'First task',
    status: TaskStatus.COMPLETED
  });

  const state = tracker.getState();
  const formatter = ProgressFormatterFactory.create('progress');
  const output = formatter.format(state);

  if (!output.includes('Progress:')) {
    throw new Error('Expected output to contain "Progress:"');
  }

  if (!output.includes('Total:')) {
    throw new Error('Expected output to contain "Total:"');
  }

  if (!output.includes('█')) {
    throw new Error('Expected output to contain progress bar');
  }
});

// Test 10: JSON formatter
await runTest('JSON formatter produces valid JSON', () => {
  const tracker = new ProgressTracker();

  tracker.addSubtask({
    id: 'task1',
    description: 'First task',
    status: TaskStatus.COMPLETED
  });

  const state = tracker.getState();
  const formatter = ProgressFormatterFactory.create('json');
  const output = formatter.format(state);

  const parsed = JSON.parse(output);

  if (!parsed.totalSubtasks || parsed.totalSubtasks !== 1) {
    throw new Error('Expected totalSubtasks to be 1');
  }

  if (!Array.isArray(parsed.subtasks)) {
    throw new Error('Expected subtasks to be an array');
  }

  if (!parsed.timestamp) {
    throw new Error('Expected timestamp to be present');
  }
});

// Test 11: Monitoring interval
await runTest('Start and stop monitoring', async () => {
  const tracker = new ProgressTracker();
  let callbackCount = 0;

  tracker.startMonitoring(50, () => {
    callbackCount++;
  });

  // Wait for at least 1 callback
  await new Promise(resolve => setTimeout(resolve, 200));

  if (callbackCount < 1) {
    throw new Error('Expected at least 1 callback');
  }

  tracker.stopMonitoring();

  // Wait and verify no more callbacks
  const previousCount = callbackCount;
  await new Promise(resolve => setTimeout(resolve, 150));

  if (callbackCount !== previousCount) {
    throw new Error('Expected no more callbacks after stop');
  }
});

// Test 12: Clear all subtasks
await runTest('Clear all subtasks', () => {
  const tracker = new ProgressTracker();

  tracker.addSubtask({
    id: 'task1',
    description: 'First task',
    status: TaskStatus.PENDING
  });

  if (tracker.getAllSubtasks().length !== 1) {
    throw new Error('Expected 1 subtask before clear');
  }

  tracker.clear();

  if (tracker.getAllSubtasks().length !== 0) {
    throw new Error('Expected 0 subtasks after clear');
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Progress Tracking Tests: ${passed}/${passed + failed} passed`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}
