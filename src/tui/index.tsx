/**
 * TUI Dashboard CLI Entry Point
 */

import React from 'react';
import { render } from 'ink';
import { Box, Text } from 'ink';
import { Dashboard } from './dashboard.js';
import { DAGVisualizer } from './dag-visualizer.js';
import { SubtaskWithDependencies, TaskStatus } from '../dependencies/types.js';
import { useBackendMonitoring } from './useBackendMonitoring.js';
import * as path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const isDebug = args.includes('--debug');
const isVerbose = args.includes('--verbose');
const teamIndex = args.indexOf('--team');
const taskIndex = args.indexOf('--task');
const teamName = teamIndex >= 0 ? args[teamIndex + 1] : null;
const taskDescription = taskIndex >= 0 ? args[taskIndex + 1] : null;
const isLiveMode = teamName !== null && taskDescription !== null;

// Enable debug logging
if (isDebug || isVerbose) {
  console.log('[DEBUG] Debug mode:', isDebug);
  console.log('[DEBUG] Verbose mode:', isVerbose);
  console.log('[DEBUG] Team:', teamName);
  console.log('[DEBUG] Task:', taskDescription);
  console.log('[DEBUG] Live mode:', isLiveMode);
  console.log('[DEBUG] Args:', args);
}

// Mock data for demo
const mockSubtasks: SubtaskWithDependencies[] = [
  {
    id: 'task-1',
    description: 'Design database schema',
    dependencies: [],
    status: TaskStatus.COMPLETED,
    assignedTo: 'agent-1'
  },
  {
    id: 'task-2',
    description: 'Create API endpoints',
    dependencies: ['task-1'],
    status: TaskStatus.IN_PROGRESS,
    assignedTo: 'agent-2',
    progress: 45
  },
  {
    id: 'task-3',
    description: 'Implement authentication',
    dependencies: ['task-1'],
    status: TaskStatus.WAITING,
    assignedTo: 'agent-3'
  },
  {
    id: 'task-4',
    description: 'Write unit tests',
    dependencies: ['task-2', 'task-3'],
    status: TaskStatus.PENDING,
    assignedTo: 'agent-1'
  },
  {
    id: 'task-5',
    description: 'Deploy to production',
    dependencies: ['task-4'],
    status: TaskStatus.PENDING,
    assignedTo: 'agent-2'
  }
];

// Live Dashboard Component with real-time monitoring
const LiveDashboard: React.FC = () => {
  const { state, addLog, clearLogs, refreshSubtasks } = useBackendMonitoring({
    teamName: teamName || 'default-team',
    debug: isDebug
  });

  const { subtasks, isConnected, error } = state;

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text color="yellow">Falling back to demo mode...</Text>
      </Box>
    );
  }

  const displaySubtasks = isConnected && subtasks.length > 0 ? subtasks : mockSubtasks;
  const displayTaskName = taskDescription || 'Sample Task';

  return (
    <Dashboard
      taskName={displayTaskName}
      subtasks={displaySubtasks}
      debug={isDebug}
      verbose={isVerbose}
      teamName={teamName || undefined}
    />
  );
};

// Demo Dashboard Component (mock data)
const DemoDashboard: React.FC = () => {
  return (
    <Dashboard
      taskName="Build a REST API (Demo)"
      subtasks={mockSubtasks}
      debug={isDebug}
      verbose={isVerbose}
    />
  );
};

// Main App Component
const App: React.FC = () => {
  // Show DAG visualization first
  if (isDebug) {
    const dagVisualizer = new DAGVisualizer({ width: 80, showStatus: true });
    const result = dagVisualizer.visualize(mockSubtasks);
    console.log('\n');
    console.log(result.lines.join('\n'));
    console.log('\n');
  }

  return (
    <>
      {isLiveMode ? <LiveDashboard /> : <DemoDashboard />}
    </>
  );
};

// Render app
const { waitUntilExit } = render(<App />);
await waitUntilExit();
