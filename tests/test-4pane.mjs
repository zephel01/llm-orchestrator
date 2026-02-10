#!/usr/bin/env node

import { spawn } from 'child_process';
import { exec } from 'child_process';

async function test4Pane() {
  console.log('\n=== Testing 4-Pane Layout ===\n');

  try {
    // Kill any existing sessions
    await exec('tmux kill-server 2>/dev/null || true');

    // Create a new tmux session
    const cli = spawn('node', ['dist/src/cli.js', 'run', 'my-ollama-team', '"Test"', '--split-pane-advanced', '3'], {
      stdio: 'inherit',
      shell: true,
      detached: true
    });

    // Wait for session to be created
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check pane layout
    const { stdout: panesOutput } = await exec('tmux list-panes -F "#{pane_index}: [#{pane_width}x#{pane_height}]" $(tmux list-sessions 2>/dev/null | grep llm-orchestrator | head -1 | sed "s/:.*//")');
    console.log('\nPane Layout:');
    const panes = panesOutput.trim().split('\n').filter(line => line.trim());
    panes.forEach((pane, index) => {
      console.log(`  Pane ${index}: ${pane}`);
    });

    console.log('\nExpected layout:');
    console.log('  Pane 0: ~60% width (left)');
    console.log('  Pane 1: ~40% width (right top) - TUI Dashboard');
    console.log('  Pane 2: ~40% width (right middle) - Agent Logs');
    console.log('  Pane 3: ~40% width (right bottom) - System Monitor');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

test4Pane();
