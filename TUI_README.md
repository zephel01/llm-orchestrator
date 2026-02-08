# LLM Orchestrator TUI Dashboard

Terminal User Interface (TUI) for monitoring and managing LLM agent tasks.

## Features

### DAG Visualization
- Visual representation of task dependencies
- Real-time status updates
- Progress tracking for in-progress tasks
- Conditional dependency support

### Dashboard
- Real-time task monitoring
- Agent status display
- Progress bars for task completion
- Log stream with timestamps
- System resource monitoring (CPU, Memory, GPU)
- **Interactive keyboard shortcuts**
- **Task filtering by status**
- **Help menu**
- **Toggle visibility of UI components**

### System Monitor
- CPU usage with core count
- Memory usage with detailed stats
- GPU monitoring (if available)
- VRAM tracking
- Color-coded usage indicators

### Interactive Features

#### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `h` / `?` | Show/Hide help menu |
| `r` | Manual refresh of tasks |
| `s` | Cycle through status filters (All/Pending/In Progress/Completed/Failed) |
| `l` | Toggle log display |
| `a` | Toggle agents panel display |
| `d` | Toggle debug mode (requires restart) |
| `v` | Toggle verbose mode (requires restart) |
| `q` / `ESC` | Exit dashboard |

#### Status Filtering

The dashboard supports filtering tasks by status:
- **All**: Shows all tasks
- **Pending**: Shows only pending tasks
- **In Progress**: Shows only currently executing tasks
- **Completed**: Shows only finished tasks
- **Failed**: Shows only failed tasks

The status bar at the top displays the current filter and task counts for each status.

### Modes

#### Demo Mode
```bash
npm run tui
```
Uses mock data for demonstration purposes.

#### Live Mode
```bash
npm run tui -- --team <team-name> --task "Task description"
```
Connects to actual team backend for real task monitoring.

#### Debug Mode
```bash
npm run tui -- --debug
```
Enables verbose logging and displays detailed debug information.

#### Verbose Mode
```bash
npm run tui -- --verbose
```
Shows extended log entries (20 vs 8 default).

## Architecture

### Components

#### `Dashboard`
Main dashboard component that coordinates all sub-components and handles keyboard input.

#### `DAGVisualizer`
Renders dependency graphs using ASCII/Unicode characters.

#### `DAGView`
React wrapper for DAG visualization.

#### `SystemMonitor`
Monitors system resources using `systeminformation` library.

#### `AgentPanel`
Displays tasks assigned to a specific agent with status tracking.

#### `LogStream`
Shows real-time logs from application with configurable history size.

#### `HelpMenu`
Displays keyboard shortcuts and usage information.

#### `StatusFilter`
Shows current filter and task counts by status.

#### `useBackendMonitoring`
Custom hook for backend integration and real-time updates.

### Backend Integration

#### Communication
Uses StorageBackend interface for:
- Message passing between agents
- Pub/Sub for task updates
- State management
- Lock mechanism

#### Task Management
- CRUD operations for subtasks
- Batch updates
- Filtering by agent/status
- Real-time synchronization
- Auto-refresh every 2 seconds in live mode

## Development

### Project Structure
```
src/tui/
├── dashboard.tsx           # Main dashboard with interactive features
├── dag-view.tsx          # DAG visualization wrapper
├── dag-visualizer.ts     # DAG rendering logic
├── system-monitor.tsx     # System resource monitor
├── index.tsx             # TUI entry point
├── useBackendMonitoring.ts # Backend monitoring hook
└── STYLE_GUIDE.md        # Style guidelines
```

### Testing

Run the DAG visualizer demo:
```bash
npm run tui:demo
```

### Adding New Features

1. Create new component in `src/tui/`
2. Import and integrate in `Dashboard` component
3. Add keyboard shortcut handling in `useInput` hook
4. Update help menu if needed
5. Test thoroughly before committing

## Future Enhancements

- Task creation/editing via UI
- Agent communication monitoring
- Task dependency visualization
- Scrolling support for long lists
- Configuration panel
- Multiple task management
- Task search functionality
- Export/import task configurations
- Custom theme support
