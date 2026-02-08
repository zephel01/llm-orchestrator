/**
 * TUI Dashboard
 * Terminal User Interface for LLM Orchestrator
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { TaskStatus, SubtaskWithDependencies } from '../dependencies/types.js';
import { SystemMonitor } from './system-monitor.js';

// Dashboard Props
interface DashboardProps {
  taskName: string;
  subtasks: SubtaskWithDependencies[];
  onExit?: () => void;
  debug?: boolean;
  verbose?: boolean;
}

// Agent Panel Component
const AgentPanel: React.FC<{
  agentId: string;
  subtasks: SubtaskWithDependencies[];
  debug?: boolean;
}> = ({ agentId, subtasks, debug = false }) => {
  const filteredSubtasks = subtasks.filter(st => st.assignedTo === agentId);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="blue"
      paddingX={1}
      flexGrow={1}
      minWidth={25}
    >
      <Text bold color="blue">Agent: {agentId}</Text>
      {debug && <Text dimColor>Tasks: {filteredSubtasks.length}</Text>}
      <Box marginTop={1}>
        {filteredSubtasks.length === 0 ? (
          <Text dimColor>No subtasks assigned</Text>
        ) : (
          filteredSubtasks.map((subtask) => (
            <Box key={`agent-${agentId}-task-${subtask.id}`} marginBottom={1} flexDirection="column">
              <Text key={`desc-${subtask.id}`}>{subtask.description.substring(0, 20)}</Text>
              <Box key={`status-box-${subtask.id}`} marginTop={0}>
                <Text key={`status-${subtask.id}`} color={getStatusColor(subtask.status)}>
                  Status: {subtask.status}
                </Text>
                {subtask.status === TaskStatus.IN_PROGRESS && subtask.progress !== undefined && (
                  <Box key={`progress-box-${subtask.id}`} marginLeft={1}>
                    <Text key={`progress-${subtask.id}`}>[{generateProgressBar(subtask.progress, 8)}] {subtask.progress}%</Text>
                  </Box>
                )}
              </Box>
              {debug && (
                <Text key={`debug-${subtask.id}`} dimColor>
                  ID: {subtask.id} | Deps: {subtask.dependencies.length}
                </Text>
              )}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

// Status color helper
function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.COMPLETED:
      return 'green';
    case TaskStatus.FAILED:
      return 'red';
    case TaskStatus.IN_PROGRESS:
      return 'yellow';
    case TaskStatus.PENDING:
      return 'gray';
    case TaskStatus.WAITING:
      return 'cyan';
    default:
      return 'white';
  }
}

// Progress bar generator
function generateProgressBar(progress: number, width: number = 15): string {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// Log Stream Component
const LogStream: React.FC<{ logs: string[]; debug?: boolean; verbose?: boolean }> = ({ logs, debug = false, verbose = false }) => {
  const visibleLogs = logs.slice(verbose ? -20 : -8); // Show more logs in verbose mode

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      flexGrow={1}
    >
      <Text key="log-header" bold color="gray">
        Log Stream (Press q to quit)
        {debug && ' | DEBUG'}
        {verbose && ' | VERBOSE'}
      </Text>
      <Box key="log-body" marginTop={1}>
        {visibleLogs.length === 0 ? (
          <Text key="no-logs" dimColor>No logs yet</Text>
        ) : (
          visibleLogs.map((log, i) => (
            <Box key={`log-entry-${i}`}>
              <Text key={`log-text-${i}-${i}`}>{log.substring(0, verbose ? 120 : 70)}</Text>
            </Box>
          ))
        )}
      </Box>
      {debug && (
        <Box key="log-debug" marginTop={1}>
          <Text dimColor>Debug: {logs.length} total logs</Text>
        </Box>
      )}
    </Box>
  );
};

// Main Dashboard Component
export const Dashboard: React.FC<DashboardProps> = ({
  taskName,
  subtasks,
  onExit,
  debug = false,
  verbose = false
}) => {
  const { exit } = useApp();
  const initialLogs = [
    '[00:00:00] Dashboard initialized',
    `[00:00:01] Task: ${taskName}`,
    `[00:00:02] Monitoring ${subtasks.length} subtasks`,
  ];
  if (debug) {
    initialLogs.push(`[00:00:03] Debug mode: ${debug}`);
  }
  if (verbose) {
    initialLogs.push(`[00:00:04] Verbose mode: ${verbose}`);
  }

  const [logs, setLogs] = useState<string[]>(initialLogs);

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onExit?.();
      exit();
    }
  });

  // Auto-update logs (demo)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timestamp = now.toTimeString().split(' ')[0];
      const activeCount = subtasks.filter(st => st.status === TaskStatus.IN_PROGRESS).length;
      const completedCount = subtasks.filter(st => st.status === TaskStatus.COMPLETED).length;

      if (activeCount > 0 || completedCount < subtasks.length) {
        setLogs(prev => [
          ...prev,
          `[${timestamp}] Active: ${activeCount}, Completed: ${completedCount}/${subtasks.length}`
        ]);
      }

      if (debug) {
        setLogs(prev => [
          ...prev,
          `[${timestamp}] Debug: Subtasks count: ${subtasks.length}, Active: ${activeCount}, Completed: ${completedCount}`
        ]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [subtasks, debug]);

  // Get unique agent IDs
  const agentIds = Array.from(
    new Set(
      subtasks
        .filter(st => st.assignedTo)
        .map(st => st.assignedTo!)
    )
  );

  // Calculate overall progress
  const completedSubtasks = subtasks.filter(st => st.status === TaskStatus.COMPLETED).length;
  const progressPercent = subtasks.length > 0
    ? Math.round((completedSubtasks / subtasks.length) * 100)
    : 0;

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box key="header" marginBottom={1}>
        <Text key="header-title" bold color="blue">LLM Orchestrator Dashboard</Text>
        <Text key="header-task" dimColor> | Task: {taskName}</Text>
      </Box>

      {/* Progress Bar */}
      <Box key="progress-section" marginBottom={1}>
        <Text key="progress-label">
          <Text key="progress-label-text" color="green">Progress: </Text>
          <Text key="progress-bar">[{generateProgressBar(progressPercent, 30)}] {progressPercent}%</Text>
        </Text>
        <Text key="progress-info" dimColor>
          {' '}({completedSubtasks}/{subtasks.length} subtasks completed)
        </Text>
      </Box>

      {/* Agent Panels Grid */}
      <Box key="agents-grid" marginBottom={1} flexDirection="row" width="100%">
        {agentIds.length === 0 ? (
          <Box key="no-agents" borderStyle="single" borderColor="gray" paddingX={1} width="100%">
            <Text key="no-agents-text" dimColor>No agents assigned yet</Text>
          </Box>
        ) : (
          agentIds.map(agentId => (
            <AgentPanel key={agentId} agentId={agentId} subtasks={subtasks} debug={debug} />
          ))
        )}
      </Box>

      {/* System Monitor */}
      <Box key="sys-monitor" marginBottom={1} width="100%">
        <SystemMonitor debug={debug} />
      </Box>

      {/* Log Stream */}
      <LogStream logs={logs} debug={debug} verbose={verbose} />
    </Box>
  );
};
