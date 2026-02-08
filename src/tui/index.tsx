/**
 * TUI Dashboard CLI Entry Point
 */

import React from 'react';
import { render } from 'ink';
import { Dashboard } from './dashboard.js';
import { DAGVisualizer } from './dag-visualizer.js';
import { SubtaskWithDependencies, TaskStatus } from '../dependencies/types.js';

// Debug mode
const args = process.argv.slice(2);
const isDebug = args.includes('--debug');
const isVerbose = args.includes('--verbose');

// Enable debug logging
if (isDebug || isVerbose) {
  console.log('[DEBUG] Debug mode:', isDebug);
  console.log('[DEBUG] Verbose mode:', isVerbose);
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

if (isDebug) {
  console.log('[DEBUG] Mock subtasks count:', mockSubtasks.length);
  console.log('[DEBUG] Agent IDs:', [...new Set(mockSubtasks.map(st => st.assignedTo))]);
}

// Show DAG visualization first
console.log('\n');
const dagVisualizer = new DAGVisualizer({ width: 80, showStatus: true });
const dag = dagVisualizer.visualize(mockSubtasks);
console.log(dag.lines.join('\n'));
console.log('\n');

// Run dashboard
const { waitUntilExit } = render(
  <Dashboard
    taskName="Build a REST API"
    subtasks={mockSubtasks}
    debug={isDebug}
    verbose={isVerbose}
    onExit={() => {
      console.log('Goodbye!');
    }}
  />
);

await waitUntilExit();
