# tmux Integration Test Guide

## Prerequisites

1. Install tmux if not already installed:
   ```bash
   # macOS
   brew install tmux

   # Linux (Ubuntu/Debian)
   sudo apt-get install tmux

   # Linux (Fedora)
   sudo dnf install tmux
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Create a test team:
   ```bash
   node dist/src/cli.js create test-team --provider anthropic
   ```

## Test 1: Basic tmux Integration (2-Pane Layout)

**Prerequisites**: Terminal size at least 80x24

**Steps**:
1. Start tmux session with 2-pane layout:
   ```bash
   node dist/src/cli.js run test-team "Write a simple hello world function" --tmux
   ```

**Expected Result**:
- tmux session is created
- Top pane (70%): TUI Dashboard with live monitoring
- Bottom pane (30%): Agent logs
- Session name format: `llm-orchestrator-test-team-<timestamp>`

**Verification**:
```bash
# List orchestrator tmux sessions
node dist/src/cli.js tmux-list

# Or use tmux directly
tmux list-sessions
```

## Test 2: Advanced tmux Layout (3-Pane Layout)

**Prerequisites**: Terminal size at least 120x30

**Steps**:
1. Start tmux session with 3-pane layout:
   ```bash
   node dist/src/cli.js run test-team "Write a simple hello world function" --tmux-advanced
   ```

**Expected Result**:
- tmux session is created
- Top left (60%): TUI Dashboard
- Top right (40%): Agent logs
- Bottom (30%): System logs (htop or top)

**Verification**:
```bash
# List sessions
node dist/src/cli.js tmux-list
```

## Test 3: Terminal Size Validation

**Test 3a: Too small terminal**

**Steps**:
1. Resize terminal to smaller than 80x24
2. Try to start tmux session:
   ```bash
   node dist/src/cli.js run test-team "Test task" --tmux
   ```

**Expected Result**:
- Error message: "Terminal size too small"
- No tmux session is created

**Test 3b: Automatic fallback for advanced layout**

**Steps**:
1. Resize terminal to 80x24 (large enough for 2-pane, too small for 3-pane)
2. Try to start with advanced layout:
   ```bash
   node dist/src/cli.js run test-team "Test task" --tmux-advanced
   ```

**Expected Result**:
- Warning message about terminal size
- Automatic fallback to 2-pane layout
- Session is created successfully

## Test 4: Session Management

**Steps**:
1. Create a session:
   ```bash
   node dist/src/cli.js run test-team "Test task" --tmux
   ```

2. List sessions in another terminal:
   ```bash
   node dist/src/cli.js tmux-list
   ```

3. Kill the session:
   ```bash
   node dist/src/cli.js tmux-kill <session-name>
   ```

   Or:
   ```bash
   tmux kill-session -t <session-name>
   ```

**Expected Result**:
- Session is created and listed
- Session is killed and removed from list

## Test 5: tmux Shortcuts

**Steps**:
1. Start a tmux session:
   ```bash
   node dist/src/cli.js run test-team "Test task" --tmux
   ```

2. Test shortcuts:
   - Detach: Press `Ctrl+B`, then `D`
   - Re-attach: `tmux attach -t <session-name>`
   - Kill session from inside: Press `Ctrl+B`, then `:` (type `kill-session`, then Enter)

**Expected Result**:
- Can detach from session
- Can re-attach to session
- Can kill session from within tmux

## Test 6: Debug and Verbose Modes

**Steps**:
1. Start tmux session with debug mode:
   ```bash
   node dist/src/cli.js run test-team "Test task" --tmux --debug
   ```

2. Start tmux session with verbose mode:
   ```bash
   node dist/src/cli.js run test-team "Test task" --tmux --verbose
   ```

**Expected Result**:
- Debug mode enables detailed logging
- Verbose mode shows verbose output in TUI Dashboard

## Test 7: Multiple Sessions

**Steps**:
1. Start multiple sessions:
   ```bash
   node dist/src/cli.js run test-team "Task 1" --tmux &
   node dist/src/cli.js run test-team "Task 2" --tmux &
   node dist/src/cli.js run test-team "Task 3" --tmux &
   ```

2. List all sessions:
   ```bash
   node dist/src/cli.js tmux-list
   ```

**Expected Result**:
- Multiple sessions are created with unique names
- All sessions are listed

## Test 8: Error Handling

**Test 8a: Session already exists**

**Steps**:
1. Start a session and note its name
2. Try to create another session with the same name (manually):
   ```bash
   tmux new-session -s <existing-session-name>
   ```

**Expected Result**:
- Error message: "Session already exists"

**Test 8b: tmux not installed**

**Steps**:
1. Temporarily rename tmux:
   ```bash
   sudo mv /usr/local/bin/tmux /usr/local/bin/tmux.bak
   ```

2. Try to start tmux session:
   ```bash
   node dist/src/cli.js run test-team "Test task" --tmux
   ```

3. Restore tmux:
   ```bash
   sudo mv /usr/local/bin/tmux.bak /usr/local/bin/tmux
   ```

**Expected Result**:
- Error message: "tmux is not installed"

## Cleanup

After testing, clean up all test sessions:

```bash
# List all orchestrator sessions
node dist/src/cli.js tmux-list

# Kill all orchestrator sessions
for session in $(tmux list-sessions -F '#{session_name}' | grep '^llm-orchestrator-'); do
  tmux kill-session -t "$session"
done

# Or use the CLI command for each session
node dist/src/cli.js tmux-kill <session-name>
```

## Common Issues and Solutions

### Issue: "Terminal size too small"

**Solution**: Resize your terminal to at least 80x24 for basic layout or 120x30 for advanced layout.

### Issue: "tmux is not installed"

**Solution**: Install tmux:
- macOS: `brew install tmux`
- Linux: `sudo apt-get install tmux`

### Issue: Session not appearing in list

**Solution**:
1. Check if tmux is running: `ps aux | grep tmux`
2. Check all sessions: `tmux list-sessions`
3. Verify session name format: `llm-orchestrator-<team-name>-<timestamp>`

### Issue: Screen corruption or layout issues

**Solution**:
1. Ensure terminal size is sufficient
2. Use `Ctrl+B`, then `R` to redraw screen
3. Kill the session and restart with larger terminal

## Test Checklist

- [ ] Test 1: Basic 2-pane layout
- [ ] Test 2: Advanced 3-pane layout
- [ ] Test 3a: Terminal size validation (too small)
- [ ] Test 3b: Automatic fallback for advanced layout
- [ ] Test 4: Session management
- [ ] Test 5: tmux shortcuts
- [ ] Test 6: Debug and verbose modes
- [ ] Test 7: Multiple sessions
- [ ] Test 8a: Session already exists error
- [ ] Test 8b: tmux not installed error
- [ ] Cleanup all test sessions
