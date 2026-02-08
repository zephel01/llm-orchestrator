#!/usr/bin/env node

/**
 * Test suite for error recovery system
 */

import {
  RecoveryManager,
  RetryPolicyManager,
  ErrorDetector,
  ErrorSeverity
} from '../dist/recovery/index.js';

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

// Test 1: Retry policy creation
await runTest('Create default retry policy', () => {
  const policy = RetryPolicyManager.createDefault();
  const config = policy.getPolicy();

  if (config.maxRetries !== 3) {
    throw new Error('Expected maxRetries to be 3');
  }

  if (config.initialDelay !== 1000) {
    throw new Error('Expected initialDelay to be 1000');
  }

  if (config.backoff !== 'exponential') {
    throw new Error('Expected backoff to be exponential');
  }
});

// Test 2: Retry policy - exponential backoff
await runTest('Calculate delay with exponential backoff', () => {
  const policy = new RetryPolicyManager({
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 60000,
    backoff: 'exponential'
  });

  const delay1 = policy.calculateDelay(0);
  const delay2 = policy.calculateDelay(1);
  const delay3 = policy.calculateDelay(2);

  if (delay1 !== 1000) {
    throw new Error(`Expected delay1 to be 1000, got ${delay1}`);
  }

  if (delay2 !== 2000) {
    throw new Error(`Expected delay2 to be 2000, got ${delay2}`);
  }

  if (delay3 !== 4000) {
    throw new Error(`Expected delay3 to be 4000, got ${delay3}`);
  }
});

// Test 3: Retry policy - linear backoff
await runTest('Calculate delay with linear backoff', () => {
  const policy = new RetryPolicyManager({
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 10000,
    backoff: 'linear'
  });

  const delay1 = policy.calculateDelay(0);
  const delay2 = policy.calculateDelay(1);
  const delay3 = policy.calculateDelay(2);

  if (delay1 !== 1000) {
    throw new Error(`Expected delay1 to be 1000, got ${delay1}`);
  }

  if (delay2 !== 2000) {
    throw new Error(`Expected delay2 to be 2000, got ${delay2}`);
  }

  if (delay3 !== 3000) {
    throw new Error(`Expected delay3 to be 3000, got ${delay3}`);
  }
});

// Test 4: Retry policy - max delay cap
await runTest('Cap delay at maxDelay', () => {
  const policy = new RetryPolicyManager({
    maxRetries: 10,
    initialDelay: 1000,
    maxDelay: 5000,
    backoff: 'exponential'
  });

  // With exponential: 1000, 2000, 4000, 8000(capped to 5000)
  const delay1 = policy.calculateDelay(0);
  const delay2 = policy.calculateDelay(1);
  const delay3 = policy.calculateDelay(2);
  const delay4 = policy.calculateDelay(3);

  if (delay4 !== 5000) {
    throw new Error(`Expected delay4 to be capped at 5000, got ${delay4}`);
  }
});

// Test 5: Error detector - timeout detection
await runTest('Detect timeout errors', () => {
  const detector = new ErrorDetector();

  const timeoutError = new Error('Operation timed out');

  if (!detector.isTimeout(timeoutError)) {
    throw new Error('Expected to detect timeout error');
  }
});

// Test 6: Error detector - network error detection
await runTest('Detect network errors', () => {
  const detector = new ErrorDetector();

  const networkError1 = new Error('ECONNRESET');
  const networkError2 = new Error('ETIMEDOUT');

  if (!detector.isNetworkError(networkError1)) {
    throw new Error('Expected to detect ECONNRESET error');
  }

  if (!detector.isNetworkError(networkError2)) {
    throw new Error('Expected to detect ETIMEDOUT error');
  }
});

// Test 7: Error detector - recoverable errors
await runTest('Identify recoverable errors', () => {
  const detector = new ErrorDetector();

  const networkError = new Error('ECONNRESET');
  const timeoutError = new Error('Request timed out');
  const fatalError = new Error('Disk full');

  if (!detector.isRecoverable(networkError)) {
    throw new Error('Expected network error to be recoverable');
  }

  if (!detector.isRecoverable(timeoutError)) {
    throw new Error('Expected timeout error to be recoverable');
  }

  if (detector.isRecoverable(fatalError)) {
    throw new Error('Expected fatal error to not be recoverable');
  }
});

// Test 8: Error detector - severity classification
await runTest('Classify error severity', () => {
  const detector = new ErrorDetector();

  const criticalError = new Error('Critical system failure');
  const networkError = new Error('ECONNRESET');

  const severity1 = detector.getSeverity(criticalError);
  const severity2 = detector.getSeverity(networkError);

  if (severity1 !== ErrorSeverity.CRITICAL) {
    throw new Error('Expected CRITICAL severity for critical error');
  }

  if (severity2 !== ErrorSeverity.LOW) {
    throw new Error('Expected LOW severity for network error');
  }
});

// Test 9: Recovery manager - error handling
await runTest('Handle error with retry', async () => {
  const retryPolicy = RetryPolicyManager.createDefault();
  const manager = new RecoveryManager(retryPolicy, 'continue');

  const errorInfo = manager['errorDetector'].createErrorInfo(
    'task1',
    'agent1',
    new Error('ECONNRESET'),
    0
  );

  const result = await manager.handleError(errorInfo);

  if (!result.shouldRetry) {
    throw new Error('Expected to retry network error');
  }

  if (result.delay === undefined) {
    throw new Error('Expected delay to be set');
  }
});

// Test 10: Recovery manager - error history
await runTest('Record and retrieve error history', async () => {
  const retryPolicy = RetryPolicyManager.createDefault();
  const manager = new RecoveryManager(retryPolicy, 'continue');

  const errorInfo = manager['errorDetector'].createErrorInfo(
    'task1',
    'agent1',
    new Error('ECONNRESET'),
    0
  );

  await manager.handleError(errorInfo);

  const history = manager.getErrorHistory('task1');

  if (history.length !== 1) {
    throw new Error('Expected 1 error in history');
  }

  if (history[0].subtaskId !== 'task1') {
    throw new Error('Expected subtaskId to be task1');
  }
});

// Test 11: Recovery manager - error statistics
await runTest('Calculate error statistics', async () => {
  const retryPolicy = RetryPolicyManager.createDefault();
  const manager = new RecoveryManager(retryPolicy, 'continue');

  // Record multiple errors
  for (let i = 0; i < 3; i++) {
    const errorInfo = manager['errorDetector'].createErrorInfo(
      `task${i}`,
      `agent${i % 2}`,
      new Error('ECONNRESET'),
      0
    );
    await manager.handleError(errorInfo);
  }

  const stats = manager.getStatistics();

  if (stats.totalErrors !== 3) {
    throw new Error(`Expected 3 total errors, got ${stats.totalErrors}`);
  }

  if (stats.errorsByAgent.get('agent0') !== 2) {
    throw new Error('Expected agent0 to have 2 errors');
  }

  if (stats.errorsByAgent.get('agent1') !== 1) {
    throw new Error('Expected agent1 to have 1 error');
  }
});

// Test 12: Recovery manager - strategy
await runTest('Apply different error strategies', async () => {
  const retryPolicy = RetryPolicyManager.createDefault();
  const manager = new RecoveryManager(retryPolicy, 'stop');

  // Create an error that's not recoverable
  const errorInfo = manager['errorDetector'].createErrorInfo(
    'task1',
    'agent1',
    new Error('Disk full'),
    10  // Exceeded retries
  );

  const result = await manager.handleError(errorInfo);

  if (result.shouldRetry) {
    throw new Error('Expected not to retry after max retries');
  }

  if (result.action.type !== 'manual_intervention') {
    throw new Error('Expected manual intervention action');
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Error Recovery Tests: ${passed}/${passed + failed} passed`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}
