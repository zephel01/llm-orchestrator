// Valkey backend tests

import { ValkeyBackend } from '../dist/communication/index.js';
import { Message } from '../dist/communication/file-store.js';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
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
    const Redis = (await import('ioredis')).default;
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
      const testMessage = {
        id: 'valkey-test-1',
        from: 'sender',
        to: 'receiver',
        type: 'command',
        content: { task: 'valkey test' },
        timestamp: Date.now(),
        status: 'delivered',
      };

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

        await backend.publish('test-channel', {
          id: 'pubsub-test',
          from: 'publisher',
          to: 'subscriber',
          type: 'broadcast',
          content: { hello: 'valkey' },
          timestamp: Date.now(),
          status: 'delivered',
        });

        await new Promise(r => setTimeout(r, 500)); // Wait for message

        await backend.unsubscribe('test-channel');
        resolve(received);
      });

      if (!published) {
        throw new Error('Message not received');
      }
    });

    await backend.close();
  }

  console.log(`\n${colors.blue}Results:${colors.reset}`);
  console.log(`${colors.green}Passed:${colors.reset} ${passed}`);
  console.log(`${colors.red}Failed:${colors.reset} ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
