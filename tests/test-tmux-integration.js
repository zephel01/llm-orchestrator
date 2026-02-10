#!/usr/bin/env node
/**
 * tmux Integration Manual Test Script
 *
 * Run this script to manually test tmux integration features.
 */
import { spawn, exec } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}
function logSection(title) {
    log('\n' + '='.repeat(60), 'bright');
    log(`  ${title}`, 'cyan');
    log('='.repeat(60) + '\n', 'bright');
}
function logSubSection(title) {
    log(`\n${title}`, 'yellow');
    log('-'.repeat(60), 'yellow');
}
function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}
function logError(message) {
    log(`❌ ${message}`, 'red');
}
function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}
function logCommand(command) {
    log(`\n  ${command}`, 'cyan');
}
async function execCommand(command) {
    return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
            resolve({ stdout: stdout.trim(), stderr: stderr.trim(), error });
        });
    });
}
async function checkPrerequisites() {
    logSection('Checking Prerequisites');
    // Check Node.js version
    const nodeVersion = process.version;
    logInfo(`Node.js version: ${nodeVersion}`);
    // Check if tmux is installed
    const { error: tmuxError } = await execCommand('which tmux');
    if (tmuxError) {
        logError('tmux is not installed');
        logInfo('Install tmux: brew install tmux (macOS) or sudo apt-get install tmux (Linux)');
        return false;
    }
    logSuccess('tmux is installed');
    // Check tmux version
    const { stdout: tmuxVersion } = await execCommand('tmux -V');
    logInfo(`tmux version: ${tmuxVersion}`);
    // Check if project is built
    const cliPath = path.join(__dirname, '..', 'dist', 'src', 'cli.js');
    const { error: buildError } = await execCommand(`test -f ${cliPath}`);
    if (buildError) {
        logError('Project is not built');
        logInfo('Run: npm run build');
        return false;
    }
    logSuccess('Project is built');
    return true;
}
async function testTerminalSize() {
    logSection('Terminal Size Validation');
    const { stdout: size } = await execCommand('stty size');
    const [rows, cols] = size.split(' ').map(Number);
    logInfo(`Current terminal size: ${cols}x${rows}`);
    if (cols >= 80 && rows >= 24) {
        logSuccess('Terminal is large enough for basic 2-pane layout');
    }
    else {
        logError('Terminal is too small for basic 2-pane layout (minimum 80x24)');
    }
    if (cols >= 120 && rows >= 30) {
        logSuccess('Terminal is large enough for advanced 3-pane layout');
    }
    else {
        logInfo('Terminal is too small for advanced 3-pane layout (minimum 120x30)');
    }
    return { cols, rows };
}
async function testListSessions() {
    logSection('List LLM Orchestrator tmux Sessions');
    const cliPath = path.join(__dirname, '..', 'dist', 'src', 'cli.js');
    const { stdout, error } = await execCommand(`node ${cliPath} tmux-list`);
    if (error) {
        logError('Failed to list sessions');
        console.error(error);
    }
    else {
        log(stdout);
        logSuccess('Sessions listed successfully');
    }
    return stdout;
}
async function testCreateTeam() {
    logSection('Create Test Team');
    const cliPath = path.join(__dirname, '..', 'dist', 'src', 'cli.js');
    const teamName = 'tmux-test-team';
    const { stdout, error } = await execCommand(`node ${cliPath} list`);
    if (stdout.includes(teamName)) {
        logInfo(`Team "${teamName}" already exists`);
        return teamName;
    }
    logInfo(`Creating team: ${teamName}`);
    const { error: createError } = await execCommand(`node ${cliPath} create ${teamName} --provider anthropic`);
    if (createError) {
        logError('Failed to create team');
        console.error(createError);
        return null;
    }
    logSuccess(`Team "${teamName}" created successfully`);
    return teamName;
}
async function testBasicTmux(teamName) {
    logSection('Test 1: Basic 2-Pane tmux Layout');
    logInfo('This will start a tmux session with 2-pane layout');
    logInfo('The session will run in the background');
    logInfo('Press Ctrl+C to stop the test (the session will continue running)');
    const cliPath = path.join(__dirname, '..', 'dist', 'src', 'cli.js');
    const command = `node ${cliPath} run ${teamName} "Write a simple hello world function" --tmux`;
    logCommand(command);
    // Start tmux session in background
    const tmux = spawn('tmux', ['new-session', '-d', command], {
        shell: true,
        detached: true
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Check if session was created
    const { stdout: sessions } = await execCommand('tmux list-sessions');
    if (sessions.includes('llm-orchestrator-')) {
        logSuccess('tmux session created successfully');
        logInfo(`Session output:\n${sessions}`);
    }
    else {
        logError('Failed to create tmux session');
        return null;
    }
    // Find the orchestrator session name
    const lines = sessions.split('\n');
    let sessionName = null;
    for (const line of lines) {
        if (line.includes('llm-orchestrator-')) {
            sessionName = line.split(':')[0];
            break;
        }
    }
    if (sessionName) {
        logInfo(`Session name: ${sessionName}`);
        logInfo(`Attach with: tmux attach -t ${sessionName}`);
        logInfo(`Kill with:   node ${cliPath} tmux-kill ${sessionName}`);
    }
    return sessionName;
}
async function testKillSession(sessionName) {
    logSection('Test: Kill tmux Session');
    const cliPath = path.join(__dirname, '..', 'dist', 'src', 'cli.js');
    logInfo(`Killing session: ${sessionName}`);
    const { error } = await execCommand(`node ${cliPath} tmux-kill ${sessionName}`);
    if (error) {
        logError('Failed to kill session');
        console.error(error);
        return false;
    }
    logSuccess('Session killed successfully');
    // Verify session is gone
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const { stdout: sessions } = await execCommand('tmux list-sessions');
    if (sessions.includes(sessionName)) {
        logError('Session still exists after kill command');
        return false;
    }
    logSuccess('Session is gone');
    return true;
}
async function interactiveTest(teamName) {
    logSection('Interactive Test Menu');
    logInfo('Choose a test to run:');
    log('  1. List existing tmux sessions');
    log('  2. Create basic 2-pane tmux session (background)');
    log('  3. Create advanced 3-pane tmux session (background)');
    log('  4. Attach to existing session');
    log('  5. Kill a session');
    log('  6. Kill all orchestrator sessions');
    log('  0. Exit');
    const readline = await import('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const ask = (question) => {
        return new Promise((resolve) => {
            rl.question(question, resolve);
        });
    };
    const answer = await ask('\nYour choice: ');
    const cliPath = path.join(__dirname, '..', 'dist', 'src', 'cli.js');
    switch (answer) {
        case '1':
            await testListSessions();
            break;
        case '2':
            logSubSection('Creating basic 2-pane tmux session');
            logCommand(`node ${cliPath} run ${teamName} "Test task" --tmux`);
            log('Run this command to start the session');
            break;
        case '3':
            logSubSection('Creating advanced 3-pane tmux session');
            logCommand(`node ${cliPath} run ${teamName} "Test task" --tmux-advanced`);
            log('Run this command to start the session');
            break;
        case '4':
            const { stdout: sessions } = await execCommand('tmux list-sessions');
            logSubSection('Available sessions');
            log(sessions);
            const sessionToAttach = await ask('Enter session name to attach: ');
            logCommand(`tmux attach -t ${sessionToAttach}`);
            log('Run this command to attach to the session');
            break;
        case '5':
            const { stdout: sessions2 } = await execCommand('tmux list-sessions');
            logSubSection('Available sessions');
            log(sessions2);
            const sessionToKill = await ask('Enter session name to kill: ');
            logCommand(`tmux kill-session -t ${sessionToKill}`);
            log('Run this command to kill the session');
            break;
        case '6':
            const { stdout: sessions3 } = await execCommand('tmux list-sessions');
            const orchestratorSessions = sessions3
                .split('\n')
                .filter(line => line.includes('llm-orchestrator-'))
                .map(line => line.split(':')[0]);
            if (orchestratorSessions.length === 0) {
                logInfo('No orchestrator sessions to kill');
            }
            else {
                logInfo(`Killing ${orchestratorSessions.length} session(s)...`);
                for (const session of orchestratorSessions) {
                    await execCommand(`tmux kill-session -t ${session}`);
                    logSuccess(`Killed: ${session}`);
                }
            }
            break;
        case '0':
            rl.close();
            return false;
        default:
            logError('Invalid choice');
    }
    rl.close();
    return true;
}
async function runAllTests() {
    log('LLM Orchestrator - tmux Integration Test Suite', 'bright');
    log('==============================================', 'cyan');
    // Check prerequisites
    const prerequisitesPassed = await checkPrerequisites();
    if (!prerequisitesPassed) {
        logError('Prerequisites not met. Exiting.');
        process.exit(1);
    }
    // Test terminal size
    await testTerminalSize();
    // List existing sessions
    await testListSessions();
    // Create test team
    const teamName = await testCreateTeam();
    if (!teamName) {
        logError('Failed to create test team. Exiting.');
        process.exit(1);
    }
    // Interactive menu
    let continueTest = true;
    while (continueTest) {
        continueTest = await interactiveTest(teamName);
    }
    logSection('Cleanup');
    logInfo('Remember to clean up any remaining tmux sessions:');
    logCommand('node dist/src/cli.js tmux-list');
    logCommand('tmux list-sessions');
    logCommand('tmux kill-session -t <session-name>');
    log('\nTest suite completed. Goodbye!', 'bright');
}
// Run tests
runAllTests().catch(error => {
    logError('Test suite failed:');
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=test-tmux-integration.js.map