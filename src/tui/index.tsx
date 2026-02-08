/**
 * TUI Dashboard CLI Entry Point
 */

import React from 'react';
import { render } from 'ink';
import { Dashboard } from './dashboard.js';
import { SubtaskWithDependencies, TaskStatus } from '../dependencies/types.js';

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

// Run dashboard
const { waitUntilExit } = render(
  <Dashboard
    taskName="Build a REST API"
    subtasks={mockSubtasks}
    onExit={() => {
      console.log('Goodbye!');
    }}
  />
);

await waitUntilExit();
