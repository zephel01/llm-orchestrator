/**
 * tmux Integration for TUI Dashboard
 *
 * Provides functionality to create tmux sessions with multiple panes
 * for enhanced monitoring of agent execution.
 */

import { spawn, exec } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Minimum terminal dimensions to prevent screen corruption
export const MIN_TERMINAL_COLS = 80;
export const MIN_TERMINAL_ROWS = 24;

export interface TmuxSessionConfig {
  sessionName: string;
  teamName: string;
  task: string;
  tuiPath: string;
  debug?: boolean;
  verbose?: boolean;
  logDir?: string;
}

export interface TmuxPaneConfig {
  command: string;
  args: string[];
  label?: string;
}

/**
 * Check if tmux is installed
 */
export async function isTmuxAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('which tmux', (error) => {
      resolve(!error);
    });
  });
}

/**
 * Check terminal dimensions
 */
export async function checkTerminalSize(): Promise<{ cols: number; rows: number }> {
  return new Promise((resolve) => {
    exec('stty size', (error, stdout) => {
      if (error) {
        resolve({ cols: 80, rows: 24 });
        return;
      }
      const [rows, cols] = stdout.trim().split(' ').map(Number);
      resolve({ cols, rows });
    });
  });
}

/**
 * Validate terminal size for tmux layout
 */
export async function validateTerminalSize(minCols: number = MIN_TERMINAL_COLS, minRows: number = MIN_TERMINAL_ROWS): Promise<{ valid: boolean; cols: number; rows: number }> {
  const { cols, rows } = await checkTerminalSize();
  const valid = cols >= minCols && rows >= minRows;
  return { valid, cols, rows };
}

/**
 * Check if a tmux session already exists
 */
export async function hasSession(sessionName: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`tmux has-session -t ${sessionName} 2>/dev/null`, (error) => {
      resolve(!error);
    });
  });
}

/**
 * Create a new tmux session with the specified name
 */
export async function createSession(sessionName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`tmux new-session -d -s ${sessionName}`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

/**
 * Kill an existing tmux session
 */
export async function killSession(sessionName: string): Promise<void> {
  return new Promise((resolve) => {
    exec(`tmux kill-session -t ${sessionName} 2>/dev/null`, () => {
      resolve();
    });
  });
}

/**
 * Split the current pane vertically
 */
export async function splitVertical(sessionName: string, windowIndex: number = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`tmux split-window -v -t ${sessionName}:${windowIndex}`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

/**
 * Split the current pane horizontally
 */
export async function splitHorizontal(sessionName: string, windowIndex: number = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`tmux split-window -h -t ${sessionName}:${windowIndex}`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

/**
 * Select a pane in the session
 */
export async function selectPane(sessionName: string, windowIndex: number = 0, paneIndex: number = 0): Promise<void> {
  return new Promise((resolve) => {
    exec(`tmux select-pane -t ${sessionName}:${windowIndex}.${paneIndex}`, () => {
      resolve();
    });
  });
}

/**
 * Execute a command in a specific pane
 */
export async function sendCommand(
  sessionName: string,
  windowIndex: number,
  paneIndex: number,
  command: string,
  background: boolean = false
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = `${command}${background ? ' &' : ''}`;
    exec(`tmux send-keys -t ${sessionName}:${windowIndex}.${paneIndex} "${cmd}" C-m`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

/**
 * Set pane title
 */
export async function setPaneTitle(
  sessionName: string,
  windowIndex: number,
  paneIndex: number,
  title: string
): Promise<void> {
  return new Promise((resolve) => {
    exec(`tmux select-pane -t ${sessionName}:${windowIndex}.${paneIndex} -T "${title}"`, () => {
      resolve();
    });
  });
}

/**
 * Resize pane (percentage)
 */
export async function resizePane(
  sessionName: string,
  windowIndex: number,
  paneIndex: number,
  percentage: number,
  direction: 'L' | 'R' | 'U' | 'D' = 'D'
): Promise<void> {
  return new Promise((resolve) => {
    exec(`tmux resize-pane -t ${sessionName}:${windowIndex}.${paneIndex} -${direction} ${percentage}`, () => {
      resolve();
    });
  });
}

/**
 * Attach to a tmux session
 */
export async function attachSession(sessionName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`tmux attach-session -t ${sessionName}`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

/**
 * Create a tmux session for TUI Dashboard with log monitoring
 *
 * Layout (Simple - default):
 * ┌───────────────────────────────────────────────┐
 * │ TUI Dashboard (top, 70%)                     │
 * ├───────────────────────────────────────────────┤
 * │ Agent Logs (bottom, 30%)                    │
 * └───────────────────────────────────────────────┘
 */
export async function createTuiSession(config: TmuxSessionConfig): Promise<void> {
  const { sessionName, teamName, task, tuiPath, debug = false, verbose = false } = config;

  // Check terminal size first
  const sizeCheck = await validateTerminalSize(80, 24);
  if (!sizeCheck.valid) {
    throw new Error(
      `Terminal size too small: ${sizeCheck.cols}x${sizeCheck.rows}. ` +
      `Minimum required: 80x24. Please resize your terminal.`
    );
  }

  // Check if tmux is available
  const tmuxAvailable = await isTmuxAvailable();
  if (!tmuxAvailable) {
    throw new Error('tmux is not installed or not available in PATH');
  }

  // Check if session already exists
  const sessionExists = await hasSession(sessionName);
  if (sessionExists) {
    console.log(`\n⚠️  Session "${sessionName}" already exists.`);
    console.log(`   Attach with: tmux attach -t ${sessionName}`);
    console.log(`   Kill with:   tmux kill-session -t ${sessionName}\n`);
    throw new Error(`Session "${sessionName}" already exists`);
  }

  // Create new session
  console.log(`\n🚀 Creating tmux session: ${sessionName}\n`);
  await createSession(sessionName);

  // Pane 0 (Top): TUI Dashboard
  const tuiArgs = ['tsx', tuiPath, '--team', teamName, '--task', `"${task}"`];
  if (debug) tuiArgs.push('--debug');
  if (verbose) tuiArgs.push('--verbose');

  const tuiCommand = `npx ${tuiArgs.join(' ')}`;

  // Clear screen and set up pane
  await sendCommand(sessionName, 0, 0, 'clear');
  await sendCommand(sessionName, 0, 0, `cd ${process.cwd()}`);
  await sendCommand(sessionName, 0, 0, tuiCommand, false);

  // Wait a bit for TUI to start before splitting
  await new Promise(resolve => setTimeout(resolve, 500));

  // Split vertically for logs
  await splitVertical(sessionName, 0);

  // Resize top pane to 70%
  await resizePane(sessionName, 0, 0, 70, 'D');

  // Pane 1 (Bottom): Logs
  await sendCommand(sessionName, 0, 1, 'clear');
  await sendCommand(sessionName, 0, 1, `cd ${process.cwd()}`);

  // Watch log files or tail agent output
  const logCommand = `echo "Monitoring logs for team: ${teamName}"`;
  await sendCommand(sessionName, 0, 1, logCommand);

  console.log(`✅ tmux session created successfully!`);
  console.log(`📊 Top pane:    TUI Dashboard (70%)`);
  console.log(`📝 Bottom pane: Agent Logs (30%)`);
  console.log(`\n💡 Attach to session: tmux attach -t ${sessionName}`);
  console.log(`💡 Detach from session: Ctrl+B, then D`);
}

/**
 * Create a tmux session with three panes (advanced layout)
 *
 * Layout (requires larger terminal):
 * ┌──────────────────────┬──────────────────────┐
 * │ TUI Dashboard        │ Agent Logs           │
 * │ (Left, 60%)         │ (Right, 40%)         │
 * ├──────────────────────┴──────────────────────┤
 * │ System Logs                                 │
 * │ (Bottom, 30%)                              │
 * └────────────────────────────────────────────┘
 */
export async function createAdvancedSession(config: TmuxSessionConfig): Promise<void> {
  const { sessionName, teamName, task, tuiPath, debug = false, verbose = false, logDir } = config;

  // Check terminal size (requires larger terminal for 3-pane layout)
  const sizeCheck = await validateTerminalSize(120, 30);
  if (!sizeCheck.valid) {
    console.log(`\n⚠️  Terminal size (${sizeCheck.cols}x${sizeCheck.rows}) too small for advanced layout.`);
    console.log(`   Minimum required: 120x30. Falling back to simple 2-pane layout...\n`);
    return createTuiSession(config);
  }

  // Check if tmux is available
  const tmuxAvailable = await isTmuxAvailable();
  if (!tmuxAvailable) {
    throw new Error('tmux is not installed or not available in PATH');
  }

  // Check if session already exists
  const sessionExists = await hasSession(sessionName);
  if (sessionExists) {
    throw new Error(`Session "${sessionName}" already exists`);
  }

  // Create new session
  console.log(`\n🚀 Creating advanced tmux session: ${sessionName}\n`);
  await createSession(sessionName);

  // Pane 0 (Top Left): TUI Dashboard
  const tuiArgs = ['tsx', tuiPath, '--team', teamName, '--task', `"${task}"`];
  if (debug) tuiArgs.push('--debug');
  if (verbose) tuiArgs.push('--verbose');

  const tuiCommand = `npx ${tuiArgs.join(' ')}`;

  // Clear screen and set up pane
  await sendCommand(sessionName, 0, 0, 'clear');
  await sendCommand(sessionName, 0, 0, `cd ${process.cwd()}`);
  await sendCommand(sessionName, 0, 0, tuiCommand, false);

  // Wait a bit for TUI to start before splitting
  await new Promise(resolve => setTimeout(resolve, 500));

  // Split horizontally for agent logs
  await splitHorizontal(sessionName, 0);

  // Resize left pane to 60%
  await resizePane(sessionName, 0, 0, 60, 'R');

  // Pane 1 (Top Right): Agent Logs
  await sendCommand(sessionName, 0, 1, 'clear');
  await sendCommand(sessionName, 0, 1, `cd ${process.cwd()}`);
  const agentLogPath = logDir || path.join(process.cwd(), '.llm-orchestrator', teamName);
  await sendCommand(sessionName, 0, 1, `ls -la ${agentLogPath} 2>/dev/null || echo "Log directory not found"`, false);

  // Select pane 0 and split vertically for system logs
  await selectPane(sessionName, 0, 0);
  await splitVertical(sessionName, 0);

  // Resize top panes to 70%
  await resizePane(sessionName, 0, 0, 70, 'D');
  await resizePane(sessionName, 0, 1, 70, 'D');

  // Pane 2 (Bottom): System Logs
  await sendCommand(sessionName, 0, 2, 'clear');
  await sendCommand(sessionName, 0, 2, `cd ${process.cwd()}`);
  await sendCommand(sessionName, 0, 2, 'htop 2>/dev/null || top', false);

  console.log(`✅ Advanced tmux session created successfully!`);
  console.log(`📊 Top Left:    TUI Dashboard (60%)`);
  console.log(`🤖 Top Right:   Agent Logs (40%)`);
  console.log(`⚙️  Bottom:      System Logs (30%)`);
  console.log(`\n💡 Attach to session: tmux attach -t ${sessionName}`);
  console.log(`💡 Detach from session: Ctrl+B, then D`);
}

/**
 * List all tmux sessions
 */
export async function listSessions(): Promise<string[]> {
  return new Promise((resolve) => {
    exec('tmux list-sessions 2>/dev/null', (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }
      const sessions = stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.split(':')[0]);
      resolve(sessions);
    });
  });
}

/**
 * List all orchestrator sessions
 */
export async function listOrchestratorSessions(): Promise<string[]> {
  const sessions = await listSessions();
  return sessions.filter(name => name.startsWith('llm-orchestrator-'));
}
