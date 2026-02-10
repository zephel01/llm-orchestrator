#!/usr/bin/env node

import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testPaneHeights() {
  console.log('\n=== Testing Pane Heights ===\n');

  try {
    // Kill any existing sessions
    await execAsync('tmux kill-server 2>/dev/null || true');
    await sleep(500);

    // Create a new tmux session with split-pane-advanced
    console.log('[1/3] Creating tmux session...');
    const cli = spawn('node', ['dist/src/cli.js', 'run', 'my-ollama-team', '"Test heights"', '--split-pane-advanced', '3'], {
      stdio: 'inherit',
      shell: true,
      detached: true
    });

    // Wait for session to be created
    await sleep(3000);

    console.log('\n[2/3] Checking session...');
    // Wait a bit more for the process to complete
    await sleep(5000);

    // Check if session still exists
    const { stdout: sessionsOutput } = await execAsync('tmux list-sessions 2>/dev/null || echo ""');
    const sessions = sessionsOutput.split('\n').filter(line => line.trim() && line.includes('llm-orchestrator'));

    if (sessions.length > 0) {
      const sessionName = sessions[0].split(':')[0];
      console.log(`[3/3] ✅ Session exists: ${sessionName}`);

      console.log('\n=== Pane Layout ===');
      const { stdout: panesOutput } = await execAsync(`tmux list-panes -t ${sessionName}:0 -F "#{pane_index}: [#{pane_width}x#{pane_height}]"`);
      const panes = panesOutput.split('\n').filter(line => line.trim());

      panes.forEach((pane, index) => {
        const [paneId, size] = pane.split(': ');
        const [width, height] = size.match(/\[(\d+)x(\d+)\]/).slice(1);
        console.log(`Pane ${index}: ${size} (${width} cols x ${height} lines)`);
      });

      console.log('\n=== Verification ===');
      const pane1Match = panes[1].match(/\[(\d+)x(\d+)\]/);
      if (pane1Match) {
        const width = parseInt(pane1Match[1]);
        const height = parseInt(pane1Match[2]);

        console.log(`Pane 1 (TUI Dashboard): ${width} cols x ${height} lines`);

        if (height >= 10) {
          console.log('✅ Pane 1 height is sufficient (>= 10 lines)');
        } else if (height >= 7) {
          console.log('⚠️  Pane 1 height is minimal (7-9 lines, may be too small)');
        } else {
          console.log('❌ Pane 1 height is too small (< 7 lines)');
        }
      }

      console.log(`\n=== Summary ===`);
      console.log(`✅ Session created successfully`);
      console.log(`To inspect: tmux attach -t ${sessionName}`);
      console.log(`To cleanup: tmux kill-session -t ${sessionName}`);
    } else {
      console.log('[2/3] ❌ No session found (may have exited)');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

testPaneHeights();
