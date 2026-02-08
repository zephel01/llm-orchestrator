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
}

// Agent Panel Component
const AgentPanel: React.FC<{
  agentId: string;
  subtasks: SubtaskWithDependencies[];
}> = ({ agentId, subtasks }) => {
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
      <Box marginTop={1}>
        {filteredSubtasks.length === 0 ? (
          <Text dimColor>No subtasks assigned</Text>
        ) : (
          filteredSubtasks.map((subtask) => (
            <Box key={subtask.id} marginBottom={1} flexDirection="column">
              <Text>{subtask.description.substring(0, 20)}</Text>
              <Box marginTop={0}>
                <Text color={getStatusColor(subtask.status)}>
                  Status: {subtask.status}
                </Text>
                {subtask.status === TaskStatus.IN_PROGRESS && subtask.progress !== undefined && (
                  <Box marginLeft={1}>
                    <Text>[{generateProgressBar(subtask.progress, 8)}] {subtask.progress}%</Text>
                  </Box>
                )}
              </Box>
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
const LogStream: React.FC<{ logs: string[] }> = ({ logs }) => {
  const visibleLogs = logs.slice(-8); // Show last 8 logs

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      flexGrow={1}
    >
      <Text bold color="gray">Log Stream (Press q to quit)</Text>
      <Box marginTop={1}>
        {visibleLogs.length === 0 ? (
          <Text dimColor>No logs yet</Text>
        ) : (
          visibleLogs.map((log, i) => (
            <Box key={`log-${i}`}>
              <Text dimColor>{log.substring(0, 70)}</Text>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

// Main Dashboard Component
export const Dashboard: React.FC<DashboardProps> = ({
  taskName,
  subtasks,
  onExit
}) => {
  const { exit } = useApp();
  const [logs, setLogs] = useState<string[]>([
    '[00:00:00] Dashboard initialized',
    `[00:00:01] Task: ${taskName}`,
    `[00:00:02] Monitoring ${subtasks.length} subtasks`
  ]);

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
    }, 2000);

    return () => clearInterval(interval);
  }, [subtasks]);

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
        <Text bold color="blue">LLM Orchestrator Dashboard</Text>
        <Text dimColor> | Task: {taskName}</Text>
      </Box>

      {/* Progress Bar */}
      <Box marginBottom={1}>
        <Text>
          <Text color="green">Progress: </Text>
          <Text>[{generateProgressBar(progressPercent, 30)}] {progressPercent}%</Text>
        </Text>
        <Text dimColor>
          {' '}({completedSubtasks}/{subtasks.length} subtasks completed)
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
            <AgentPanel key={agentId} agentId={agentId} subtasks={subtasks} />
          ))
        )}
      </Box>

      {/* System Monitor */}
      <Box marginBottom={1} width="100%">
        <SystemMonitor />
      </Box>

      {/* Log Stream */}
      <LogStream logs={logs} />
    </Box>
  );
};
