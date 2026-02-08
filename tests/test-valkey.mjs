// Valkey backend tests

import { ValkeyBackend, Redlock } from '../dist/communication/index.js';
import Redis from 'ioredis';

// Message インターフェースを定義（TypeScript の型は JavaScript にコンパイルされないため）
const createMessage = (id, from, to, type, content, status = 'delivered') => ({
  id,
  from,
  to,
  type,
  content,
  timestamp: Date.now(),
  status,
});

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

async function runTests() {
  console.log(`${colors.blue}Running Valkey Backend Tests...${colors.reset}\n`);

  // Skip tests if Valkey is not available
  let valkeyAvailable = false;
  try {
    const client = new Redis({ lazyConnect: true });
    await client.connect();
    await client.quit();
    valkeyAvailable = true;
  } catch (error) {
    console.log(`${colors.yellow}⚠${colors.reset} Valkey is not available. Skipping Valkey tests.`);
    console.log(`  To test Valkey, run: docker run -p 6379:6379 valkey/valkey:latest\n`);
  }

  if (valkeyAvailable) {
    const backend = new ValkeyBackend({ prefix: 'agent-team-test' });

    await backend.initialize();

    // Test 1: Message operations
    await test('ValkeyBackend writes and reads messages', async () => {
      const testMessage = createMessage(
        'valkey-test-1',
        'sender',
        'receiver',
        'command',
        { task: 'valkey test' }
      );

      await backend.writeMessage('agent-1', testMessage);
      const messages = await backend.readMessages('agent-1');

      if (messages.length !== 1) {
        throw new Error(`Expected 1 message, got ${messages.length}`);
      }
      if (messages[0].id !== testMessage.id) {
        throw new Error('Message ID mismatch');
      }
    });

    // Test 2: Lock mechanism
    await test('ValkeyBackend acquires and releases lock', async () => {
      const resource = 'valkey-resource';
      const holder = 'holder-1';

      const acquired = await backend.acquireLock(resource, holder, 5000);
      if (!acquired) {
        throw new Error('Failed to acquire lock');
      }

      const acquiredAgain = await backend.acquireLock(resource, holder, 5000);
      if (acquiredAgain) {
        throw new Error('Should not acquire lock twice');
      }

      await backend.releaseLock(resource, holder);
      const acquiredAfterRelease = await backend.acquireLock(resource, holder, 5000);
      if (!acquiredAfterRelease) {
        throw new Error('Failed to acquire lock after release');
      }
    });

    // Test 3: State management
    await test('ValkeyBackend manages state', async () => {
      const key = 'test-state';
      const value = { data: 'test', count: 42 };

      await backend.setState(key, value);
      const retrieved = await backend.getState(key);

      if (JSON.stringify(retrieved) !== JSON.stringify(value)) {
        throw new Error('State value mismatch');
      }
    });

    // Test 4: Pub/Sub (simple test)
    await test('ValkeyBackend publishes messages', async () => {
      const published = await new Promise(async (resolve) => {
        let received = false;

        await backend.subscribe('test-channel', (message) => {
          if (message.id === 'pubsub-test') {
            received = true;
            resolve(true);
          }
        });

        await new Promise(r => setTimeout(r, 100)); // Wait for subscription

        await backend.publish('test-channel', createMessage(
          'pubsub-test',
          'publisher',
          'subscriber',
          'broadcast',
          { hello: 'valkey' }
        ));

        await new Promise(r => setTimeout(r, 500)); // Wait for message

        await backend.unsubscribe('test-channel');
        resolve(received);
      });

      if (!published) {
        throw new Error('Message not received');
      }
    });

    // Test 5: Clear messages
    await test('ValkeyBackend clears messages', async () => {
      const testMessage = createMessage(
        'valkey-test-clear',
        'sender',
        'receiver',
        'command',
        { task: 'clear test' }
      );

      await backend.writeMessage('agent-2', testMessage);
      await backend.clearMessages('agent-2');
      const messages = await backend.readMessages('agent-2');

      if (messages.length !== 0) {
        throw new Error(`Expected 0 messages after clear, got ${messages.length}`);
      }
    });

    await backend.close();

    // Test 6: Redlock with explicit configuration
    console.log(`\n${colors.blue}Redlock Tests...${colors.reset}\n`);

    await test('Redlock acquires and extends lock', async () => {
      const client = new Redis({ lazyConnect: true });
      await client.connect();

      const redlock = new Redlock([client], {
        retryCount: 3,
        retryDelay: 100,
      });

      const resource = 'redlock-test-resource';
      const holder = 'redlock-holder';
      const ttl = 3000;

      const lockInfo = await redlock.acquireLock(resource, holder, ttl);
      if (!lockInfo) {
        await client.quit();
        throw new Error('Failed to acquire Redlock');
      }

      // 延長テスト
      const extended = await redlock.extendLock(resource, holder, ttl);
      if (!extended) {
        await redlock.releaseLock(resource, holder);
        await client.quit();
        throw new Error('Failed to extend Redlock');
      }

      // 解放テスト
      const released = await redlock.releaseLock(resource, holder);
      if (!released) {
        await client.quit();
        throw new Error('Failed to release Redlock');
      }

      // 解放後に再取得できるかテスト
      const reacquired = await redlock.acquireLock(resource, holder, ttl);
      await redlock.releaseLock(resource, holder);
      await client.quit();

      if (!reacquired) {
        throw new Error('Failed to reacquire Redlock after release');
      }
    });

    // Test 7: Redlock ownership check
    await test('Redlock checks lock ownership', async () => {
      const client = new Redis({ lazyConnect: true });
      await client.connect();

      const redlock = new Redlock([client]);
      const resource = 'redlock-ownership-test';
      const holder = 'owner-1';
      const otherHolder = 'owner-2';

      await redlock.acquireLock(resource, holder, 5000);

      const isOwner = await redlock.isLockedBy(resource, holder);
      const isOtherOwner = await redlock.isLockedBy(resource, otherHolder);

      await redlock.releaseLock(resource, holder);
      await client.quit();

      if (!isOwner) {
        throw new Error('Expected to be owner of the lock');
      }
      if (isOtherOwner) {
        throw new Error('Other holder should not be owner of the lock');
      }
    });

    // Test 8: Redlock with ValkeyBackend integration
    await test('ValkeyBackend with Redlock enabled', async () => {
      const backendWithRedlock = new ValkeyBackend({
        prefix: 'agent-team-redlock-test',
        redlock: {
          retryCount: 3,
          retryDelay: 100,
        },
      });

      await backendWithRedlock.initialize();

      const resource = 'backend-redlock-resource';
      const holder = 'backend-holder';

      const acquired = await backendWithRedlock.acquireLock(resource, holder, 5000);
      if (!acquired) {
        await backendWithRedlock.close();
        throw new Error('Failed to acquire lock with Redlock');
      }

      const acquiredAgain = await backendWithRedlock.acquireLock(resource, holder, 5000);
      if (acquiredAgain) {
        await backendWithRedlock.close();
        throw new Error('Should not acquire lock twice with Redlock');
      }

      await backendWithRedlock.releaseLock(resource, holder);
      await backendWithRedlock.close();
    });

    // Test 9: Backend factory
    await test('Backend factory creates Valkey backend', async () => {
      const { createBackend } = await import('../dist/communication/index.js');

      const backend = createBackend({
        type: 'valkey',
        valkey: { prefix: 'factory-test' },
      });

      await backend.initialize();

      const testMessage = createMessage(
        'factory-test-1',
        'factory-sender',
        'factory-receiver',
        'command',
        { task: 'factory test' }
      );

      await backend.writeMessage('factory-agent', testMessage);
      const messages = await backend.readMessages('factory-agent');

      await backend.close();

      if (messages.length !== 1) {
        throw new Error(`Expected 1 message from factory, got ${messages.length}`);
      }
    });

    // Test 10: Environment variable configuration
    await test('Backend config from environment variables', async () => {
      const originalBackend = process.env.LLM_ORCHESTRATOR_BACKEND;

      try {
        process.env.LLM_ORCHESTRATOR_BACKEND = 'valkey';

        const { getBackendConfigFromEnv, createBackend } = await import('../dist/communication/index.js');

        const config = getBackendConfigFromEnv('env-test-team');
        if (config.type !== 'valkey') {
          throw new Error(`Expected valkey type, got ${config.type}`);
        }

        const backend = createBackend(config);
        await backend.initialize();

        const testMessage = createMessage(
          'env-test-1',
          'env-sender',
          'env-receiver',
          'command',
          { task: 'env test' }
        );

        await backend.writeMessage('env-agent', testMessage);
        const messages = await backend.readMessages('env-agent');

        await backend.close();

        if (messages.length !== 1) {
          throw new Error(`Expected 1 message from env config, got ${messages.length}`);
        }
      } finally {
        process.env.LLM_ORCHESTRATOR_BACKEND = originalBackend;
      }
    });
  }

  console.log(`\n${colors.blue}Results:${colors.reset}`);
  console.log(`${colors.green}Passed:${colors.reset} ${passed}`);
  console.log(`${colors.red}Failed:${colors.reset} ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
