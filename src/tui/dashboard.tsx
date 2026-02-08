/**
 * TUI Dashboard
 * Terminal User Interface for LLM Orchestrator
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { TaskStatus, SubtaskWithDependencies } from '../dependencies/types.js';
import { useBackendMonitoring } from './useBackendMonitoring.js';
import { SystemMonitor } from './system-monitor.js';

// Dashboard Component Props
interface DashboardProps {
  taskName: string;
  subtasks: SubtaskWithDependencies[];
  onExit?: () => void;
  debug?: boolean;
  verbose?: boolean;
  teamName?: string;
}

// Keyboard shortcuts state
interface KeyboardShortcuts {
  showHelp: boolean;
  showLog: boolean;
  showAgents: boolean;
  selectedFilter: TaskStatus | 'all';
}

// Dashboard Component State
interface DashboardState extends KeyboardShortcuts {
  logs: string[];
  subtasks: SubtaskWithDependencies[];
}

// Help Menu Component
const HelpMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useInput((input, key) => {
    if (key.escape || input === 'q' || input === 'h' || input === '?') {
      onClose();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      marginBottom={1}
    >
      <Text bold color="cyan">Keyboard Shortcuts</Text>
      <Box marginTop={1}>
        <Text>
          <Text color="green">h</Text> or <Text color="green">?</Text> - Show/Hide this help
        </Text>
        <Text>
          <Text color="green">q</Text> or <Text color="green">ESC</Text> - Exit dashboard
        </Text>
        <Text>
          <Text color="green">r</Text> - Refresh tasks
        </Text>
        <Text>
          <Text color="green">s</Text> - Cycle filter (all/pending/in-progress/completed)
        </Text>
        <Text>
          <Text color="green">l</Text> - Toggle log display
        </Text>
        <Text>
          <Text color="green">a</Text> - Toggle agents display
        </Text>
        <Text>
          <Text color="green">d</Text> - Toggle debug mode
        </Text>
        <Text>
          <Text color="green">v</Text> - Toggle verbose mode
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press any key to close</Text>
      </Box>
    </Box>
  );
};

// Status Filter Component
const StatusFilter: React.FC<{
  selected: TaskStatus | 'all';
  counts: { [key: string]: number };
}> = ({ selected, counts }) => {
  const getStatusColor = (status: TaskStatus | 'all'): string => {
    switch (status) {
      case 'all': return 'white';
      case TaskStatus.PENDING: return 'gray';
      case TaskStatus.IN_PROGRESS: return 'yellow';
      case TaskStatus.COMPLETED: return 'green';
      case TaskStatus.FAILED: return 'red';
      default: return 'white';
    }
  };

  return (
    <Box flexDirection="row" marginBottom={1}>
      <Text dimColor>Filter: </Text>
      <Text color={getStatusColor(selected)} bold>
        {selected === 'all' ? 'All' : selected}
      </Text>
      <Text dimColor> | </Text>
      <Text>P:{counts[TaskStatus.PENDING] || 0}</Text>
      <Text> I:{counts[TaskStatus.IN_PROGRESS] || 0}</Text>
      <Text>C:{counts[TaskStatus.COMPLETED] || 0}</Text>
      <Text>F:{counts[TaskStatus.FAILED] || 0}</Text>
    </Box>
  );
};

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
  const { state: backendState, addLog: addBackendLog, refreshSubtasks } = useBackendMonitoring({
    teamName,
    debug,
  });

  const [state, setState] = useState<DashboardState>({
    logs: [],
    subtasks: initialSubtasks,
    showHelp: false,
    showLog: true,
    showAgents: true,
    selectedFilter: 'all',
  });

  // Use backend subtasks if available, otherwise use initial subtasks
  const subtasks = backendState.subtasks.length > 0 ? backendState.subtasks : state.subtasks;

  // Get filtered subtasks
  const filteredSubtasks = state.selectedFilter === 'all'
    ? subtasks
    : subtasks.filter(st => st.status === state.selectedFilter);

  // Calculate status counts
  const statusCounts = subtasks.reduce((acc, st) => {
    acc[st.status] = (acc[st.status] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  // Toggle help
  const toggleHelp = () => {
    setState(prev => ({ ...prev, showHelp: !prev.showHelp }));
  };

  // Toggle log display
  const toggleLog = () => {
    setState(prev => ({ ...prev, showLog: !prev.showLog }));
  };

  // Toggle agents display
  const toggleAgents = () => {
    setState(prev => ({ ...prev, showAgents: !prev.showAgents }));
  };

  // Cycle through filters
  const cycleFilter = () => {
    const filters: Array<TaskStatus | 'all'> = ['all', TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED];
    const currentIndex = filters.indexOf(state.selectedFilter);
    const nextIndex = (currentIndex + 1) % filters.length;
    setState(prev => ({ ...prev, selectedFilter: filters[nextIndex] }));
  };

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onExit?.();
      exit();
      return;
    }

    // Help toggle
    if (input === 'h' || input === '?') {
      toggleHelp();
      return;
    }

    // Refresh
    if (input === 'r') {
      refreshSubtasks();
      addBackendLog('[INFO] Manual refresh triggered');
      return;
    }

    // Toggle sections
    if (input === 's') {
      cycleFilter();
      addBackendLog(`[INFO] Filter: ${state.selectedFilter}`);
      return;
    }

    // Toggle log display
    if (input === 'l') {
      toggleLog();
      return;
    }

    // Toggle agents display
    if (input === 'a') {
      toggleAgents();
      return;
    }
  });

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
      initialLogs.push(`[00:00:06] Backend: ${backendState.isConnected ? 'Connected' : 'Disconnected'}`);
    }
    if (backendState.error) {
      initialLogs.push(`[00:00:07] Error: ${backendState.error}`);
    }
    setState(prev => ({ ...prev, logs: initialLogs }));
  }, [taskName, subtasks.length, debug, verbose, teamName, backendState.isConnected, backendState.error]);

  // Sync backend logs to dashboard logs
  useEffect(() => {
    // Backend logs are added via addBackendLog hook
    // This effect is kept for future enhancements
  }, [backendState.lastUpdate]);

  // Auto-refresh subtasks in live mode
  useEffect(() => {
    if (!teamName || !backendState.isConnected) {
      return;
    }

    const interval = setInterval(async () => {
      await refreshSubtasks();
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, [teamName, backendState.isConnected, refreshSubtasks]);

  // Auto-update logs (demo)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timestamp = now.toTimeString().split(' ')[0];
      const activeCount = subtasks.filter(st => st.status === TaskStatus.IN_PROGRESS).length;
      const completedCount = subtasks.filter(st => st.status === TaskStatus.COMPLETED).length;

      if (activeCount > 0 || completedCount < subtasks.length) {
        setState(prev => ({
          ...prev,
          logs: [
            ...prev.logs,
            `[${timestamp}] Active: ${activeCount}, Completed: ${completedCount}/${subtasks.length}`
          ]
        }));
      }

      if (debug) {
        setState(prev => ({
          ...prev,
          logs: [
            ...prev.logs,
            `[${timestamp}] Debug: Subtasks count: ${subtasks.length}, Active: ${activeCount}, Completed: ${completedCount}`
          ]
        }));
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
      {/* Help Menu */}
      {state.showHelp && <HelpMenu onClose={toggleHelp} />}

      {/* Header */}
      <Box marginBottom={1}>
        <Text>
          <Text bold color="blue">LLM Orchestrator Dashboard</Text>
          <Text dimColor> | Task: {taskName}</Text>
        </Text>
      </Box>

      {/* Status Filter */}
      <StatusFilter selected={state.selectedFilter} counts={statusCounts} />

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
      {state.showAgents && (
        <Box marginBottom={1} flexDirection="row" width="100%">
          {agentIds.length === 0 ? (
            <Box borderStyle="single" borderColor="gray" paddingX={1} width="100%">
              <Text dimColor>No agents assigned yet</Text>
            </Box>
          ) : (
            agentIds.map(agentId => (
              <AgentPanel key={agentId} agentId={agentId} subtasks={filteredSubtasks} debug={debug} />
            ))
          )}
        </Box>
      )}

      {/* System Monitor */}
      <Box marginBottom={1} width="100%">
        <SystemMonitor debug={debug} />
      </Box>

      {/* Log Stream */}
      {state.showLog && (
        <LogStream logs={state.logs} debug={debug} verbose={verbose} />
      )}
    </Box>
  );
};
