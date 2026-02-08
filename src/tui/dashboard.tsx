/**
 * TUI Dashboard
 * Terminal User Interface for LLM Orchestrator
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { TaskStatus, SubtaskWithDependencies } from '../dependencies/types.js';
import { useBackendMonitoring } from './useBackendMonitoring.js';

// Dashboard Props
interface DashboardProps {
  taskName: string;
  subtasks: SubtaskWithDependencies[];
  onExit?: () => void;
  debug?: boolean;
  verbose?: boolean;
  teamName?: string;
}
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

  if (filteredSubtasks.length === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="blue"
        paddingX={1}
        flexGrow={1}
        minWidth={25}
      >
        <Text bold color="cyan">Agent: {agentId}</Text>
        {debug && <Text dimColor>Tasks: {filteredSubtasks.length}</Text>}
        <Text dimColor>No subtasks assigned</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
      flexGrow={1}
      minWidth={25}
    >
      <Text bold color="cyan">Agent: {agentId}</Text>
      {debug && <Text dimColor>Tasks: {filteredSubtasks.length}</Text>}
      {filteredSubtasks.map((subtask, idx) => (
        <Box key={`task-${subtask.id}`} flexDirection="column" marginBottom={1}>
          <Text>
            {subtask.description.substring(0, 20)}
            <Text> </Text>
            <Text color={getStatusColor(subtask.status)}>
              Status: {subtask.status}
            </Text>
          </Text>
          {subtask.status === TaskStatus.IN_PROGRESS && subtask.progress !== undefined && (
            <Text> [{generateProgressBar(subtask.progress, 8)}] {subtask.progress}%</Text>
          )}
          {debug && (
            <Text dimColor>
              ID: {subtask.id} | Deps: {subtask.dependencies.length}
            </Text>
          )}
        </Box>
      ))}
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
      paddingX={1}
      flexGrow={1}
    >
      <Text bold dimColor>
        Log Stream (Press q to quit)
        {debug && ' | DEBUG'}
        {verbose && ' | VERBOSE'}
      </Text>

      {visibleLogs.length === 0 ? (
        <Text dimColor>No logs yet</Text>
      ) : (
        visibleLogs.map((log, i) => (
          <Text key={`log-${i}-${log.length}`} dimColor>
            {log.substring(0, verbose ? 120 : 70)}
          </Text>
        ))
      )}

      {debug && (
        <Text dimColor>
          Debug: {logs.length} total logs
        </Text>
      )}
    </Box>
  );
};

// Main Dashboard Component
export const Dashboard: React.FC<DashboardProps> = ({
  taskName,
  subtasks: initialSubtasks,
  onExit,
  debug = false,
  verbose = false,
  teamName
}) => {
  const { exit } = useApp();
  const { state: backendState, addLog: addBackendLog } = useBackendMonitoring({
    teamName,
    debug,
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<SubtaskWithDependencies[]>(initialSubtasks);

  // Initialize logs on mount
  useEffect(() => {
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
    if (teamName) {
      initialLogs.push(`[00:00:05] Team: ${teamName}`);
    }
    setLogs(initialLogs);
  }, [taskName, subtasks.length, debug, verbose, teamName]);

  // Sync backend logs to dashboard logs
  useEffect(() => {
    // Backend logs are added via addBackendLog hook
    // This effect is kept for future enhancements
  }, [backendState.lastUpdate]);

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
      <Box marginBottom={1}>
        <Text>
          <Text bold color="blue">LLM Orchestrator Dashboard</Text>
          <Text dimColor> | Task: {taskName}</Text>
        </Text>
      </Box>

      {/* Progress Bar */}
      <Box marginBottom={1}>
        <Text>
          <Text color="green">Progress: </Text>
          <Text>[{generateProgressBar(progressPercent, 30)}] {progressPercent}%</Text>
          <Text dimColor>
             ({completedSubtasks}/{subtasks.length} subtasks completed)
          </Text>
        </Text>
      </Box>

      {/* Agent Panels Grid */}
      <Box marginBottom={1} flexDirection="row" width="100%">
        {agentIds.length === 0 ? (
          <Box borderStyle="single" borderColor="gray" paddingX={1} width="100%">
            <Text dimColor>No agents assigned yet</Text>
          </Box>
        ) : (
          agentIds.map(agentId => (
            <AgentPanel key={agentId} agentId={agentId} subtasks={subtasks} debug={debug} />
          ))
        )}
      </Box>

      {/* System Monitor */}
      <Box marginBottom={1} width="100%">
        <SystemMonitor debug={debug} />
      </Box>

      {/* Log Stream */}
      <LogStream logs={logs} debug={debug} verbose={verbose} />
    </Box>
  );
};
