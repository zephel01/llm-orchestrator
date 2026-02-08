// Provider tests for LM Studio and llama-server

import { LMStudioProvider, LlamaServerProvider } from '../dist/providers/index.js';
import { createProvider, getAvailableProviders } from '../dist/providers/index.js';

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
  console.log(`${colors.blue}Running Provider Tests...${colors.reset}\n`);

  // Test 1: LM Studio provider creation
  await test('LM Studio provider can be created', async () => {
    const provider = new LMStudioProvider(
      'http://localhost:1234',
      'meta-llama-3.70b-instruct'
    );

    if (provider.name !== 'lmstudio') {
      throw new Error('Provider name should be lmstudio');
    }
  });

  // Test 2: Llama Server provider creation
  await test('Llama Server provider can be created', async () => {
    const provider = new LlamaServerProvider(
      'http://localhost:8080',
      'llama3.2:8b-instruct'
    );

    if (provider.name !== 'llama-server') {
      throw new Error('Provider name should be llama-server');
    }
  });

  // Test 3: Factory creates LM Studio provider
  await test('Factory creates LM Studio provider', async () => {
    const provider = createProvider({
      type: 'lmstudio',
      baseURL: 'http://localhost:1234',
      model: 'meta-llama-3.70b-instruct',
    });

    if (provider.name !== 'lmstudio') {
      throw new Error('Provider name should be lmstudio');
    }
  });

  // Test 4: Factory creates Llama Server provider
  await test('Factory creates Llama Server provider', async () => {
    const provider = createProvider({
      type: 'llama-server',
      baseURL: 'http://localhost:8080',
      model: 'llama3.2:8b-instruct',
    });

    if (provider.name !== 'llama-server') {
      throw new Error('Provider name should be llama-server');
    }
  });

  // Test 5: Available providers include LM Studio and Llama Server
  await test('Available providers include LM Studio and Llama Server', async () => {
    const providers = getAvailableProviders();

    if (!providers.includes('lmstudio')) {
      throw new Error('lmstudio should be in available providers');
    }

    if (!providers.includes('llama-server')) {
      throw new Error('llama-server should be in available providers');
    }
  });

  // Test 6: LM Studio has countTokens method
  await test('LM Studio provider has countTokens method', async () => {
    const provider = new LMStudioProvider();

    if (typeof provider.countTokens !== 'function') {
      throw new Error('Provider should have countTokens method');
    }

    const count = provider.countTokens('Hello, world!');
    if (count <= 0) {
      throw new Error('Token count should be positive');
    }
  });

  // Test 7: Llama Server has countTokens method
  await test('Llama Server provider has countTokens method', async () => {
    const provider = new LlamaServerProvider();

    if (typeof provider.countTokens !== 'function') {
      throw new Error('Provider should have countTokens method');
    }

    const count = provider.countTokens('Hello, world!');
    if (count <= 0) {
      throw new Error('Token count should be positive');
    }
  });

  // Test 8: LM Studio chat method exists
  await test('LM Studio provider has chat method', async () => {
    const provider = new LMStudioProvider();

    if (typeof provider.chat !== 'function') {
      throw new Error('Provider should have chat method');
    }
  });

  // Test 9: Llama Server chat method exists
  await test('Llama Server provider has chat method', async () => {
    const provider = new LlamaServerProvider();

    if (typeof provider.chat !== 'function') {
      throw new Error('Provider should have chat method');
    }
  });

  console.log(`\n${colors.blue}Results:${colors.reset}`);
  console.log(`${colors.green}Passed:${colors.reset} ${passed}`);
  console.log(`${colors.red}Failed:${colors.reset} ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
