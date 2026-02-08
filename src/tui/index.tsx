/**
 * TUI Dashboard CLI Entry Point
 */

import React from 'react';
import { render } from 'ink';
import { Dashboard } from './dashboard.js';
import { DAGVisualizer } from './dag-visualizer.js';
import { SubtaskWithDependencies, TaskStatus } from '../dependencies/types.js';
import { TeamManager } from '../team-manager/index.js';
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

// Load subtasks
let subtasks: SubtaskWithDependencies[];
let taskName: string;

if (isLiveMode) {
  try {
    const teamManager = new TeamManager();
    const teamConfig = await teamManager.getTeamConfig(teamName!);

    if (!teamConfig) {
      console.error(`Team "${teamName}" not found. Available teams:`);
      const teams = await teamManager.discoverTeams();
      teams.forEach(t => console.log(`  - ${t.name}`));
      process.exit(1);
    }

    taskName = taskDescription!;

    // Load subtasks from backend if available
    console.log('[INFO] Live mode enabled for team:', teamName);
    console.log('[INFO] Task:', taskDescription);

    // Check for existing subtasks in backend
    const { createBackend } = await import('../communication/factory.js');
    const basePath = path.join(process.env.HOME || '.', '.llm-orchestrator');
    const backend = createBackend({
      type: 'file',
      teamName,
      basePath,
    });

    await backend.initialize();

    try {
      const subtasksState = await backend.getState('subtasks');
      if (subtasksState && Array.isArray(subtasksState) && subtasksState.length > 0) {
        subtasks = subtasksState;
        console.log('[INFO] Loaded existing subtasks from backend');
      } else {
        // Initialize with mock subtasks for demo
        subtasks = mockSubtasks;
        await backend.setState('subtasks', subtasks);
        console.log('[INFO] Initialized demo subtasks in backend');
      }
    } catch (error) {
      console.log('[WARN] No existing subtasks found, initializing demo data');
      subtasks = mockSubtasks;
      try {
        await backend.setState('subtasks', subtasks);
      } catch (setStateError) {
        console.error('[ERROR] Failed to save subtasks:', setStateError);
      }
    }

    await backend.close();
  } catch (error) {
    console.error('[ERROR] Failed to load team configuration:', error);
    process.exit(1);
  }
} else {
  taskName = 'Build a REST API (Demo)';
  subtasks = mockSubtasks;
}

if (isDebug) {
  console.log('[DEBUG] Subtasks count:', subtasks.length);
  console.log('[DEBUG] Agent IDs:', [...new Set(subtasks.map(st => st.assignedTo))]);
}

// Show DAG visualization first
console.log('\n');
const dagVisualizer = new DAGVisualizer({ width: 80, showStatus: true });
const dag = dagVisualizer.visualize(subtasks);
console.log(dag.lines.join('\n'));
console.log('\n');

// Run dashboard
const { waitUntilExit } = render(
  <Dashboard
    taskName={taskName}
    subtasks={subtasks}
    debug={isDebug}
    verbose={isVerbose}
    teamName={teamName || undefined}
    onExit={() => {
      console.log('Goodbye!');
    }}
  />
);

await waitUntilExit();
