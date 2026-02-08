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

### System Monitor
- CPU usage with core count
- Memory usage with detailed stats
- GPU monitoring (if available)
- VRAM tracking
- Color-coded usage indicators

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

### Key Controls
- `q` or `Escape`: Exit dashboard
- Other keys: Reserved for future features

## Architecture

### Components

#### `Dashboard`
Main dashboard component that coordinates all sub-components.

#### `DAGVisualizer`
Renders dependency graphs using ASCII/Unicode characters.

#### `DAGView`
React wrapper for DAG visualization.

#### `SystemMonitor`
Monitors system resources using the `systeminformation` library.

#### `AgentPanel`
Displays tasks assigned to a specific agent.

#### `LogStream`
Shows real-time logs from the application.

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

## Style Guide

See `src/tui/STYLE_GUIDE.md` for detailed styling conventions.

### Color Semantics

| Usage | Color |
|--------|-------|
| Default | (none) |
| User Input/Selection | cyan |
| Success/Completed | green |
| Error/Failed | red |
| Warning | yellow |
| Info | blue |
| Agent/In Progress | magenta |
| Secondary Info | dim |

## Development

### Project Structure
```
src/tui/
├── dashboard.tsx           # Main dashboard component
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

## Future Enhancements

- Interactive task management
- Keyboard shortcuts
- Scrolling support
- Real-time task updates from backend
- Task creation/editing
- Agent communication monitoring
- Task dependency visualization
