/**
 * Hook for monitoring backend messages and task updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SubtaskWithDependencies, TaskStatus } from '../dependencies/types.js';
import { createBackend } from '../communication/factory.js';
import * as path from 'path';

interface UseBackendMonitoringOptions {
  teamName?: string;
  debug?: boolean;
}

interface BackendMonitoringState {
  subtasks: SubtaskWithDependencies[];
  isConnected: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

interface UseBackendMonitoringReturn {
  state: BackendMonitoringState;
  addLog: (message: string) => void;
  clearLogs: () => void;
  refreshSubtasks: () => Promise<void>;
}

export function useBackendMonitoring(
  options: UseBackendMonitoringOptions
): UseBackendMonitoringReturn {
  const { teamName, debug = false } = options;

  const [state, setState] = useState<BackendMonitoringState>({
    subtasks: [],
    isConnected: false,
    lastUpdate: null,
    error: null,
  });

  const logsRef = useRef<string[]>([]);
  const backendRef = useRef<any>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toTimeString().split(' ')[0];
    logsRef.current.push(`[${timestamp}] ${message}`);
  }, []);

  const clearLogs = useCallback(() => {
    logsRef.current = [];
  }, []);

  const refreshSubtasks = useCallback(async () => {
    if (!teamName || !backendRef.current) {
      return;
    }

    try {
      if (debug) {
        addLog('[DEBUG] Refreshing subtasks from backend');
      }

      // Load subtasks from backend state
      const subtasksState = await backendRef.current.getState('subtasks');
      const subtasks: SubtaskWithDependencies[] = subtasksState || [];

      setState(prev => ({
        ...prev,
        subtasks,
        lastUpdate: new Date(),
      }));

      if (debug) {
        addLog(`[DEBUG] Loaded ${subtasks.length} subtasks`);
      }
    } catch (error) {
      const errorMessage = `Failed to refresh subtasks: ${error}`;
      console.error('[ERROR]', errorMessage);
      addLog(`[ERROR] ${errorMessage}`);
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
    }
  }, [teamName, debug, addLog]);

  // Initialize backend connection
  useEffect(() => {
    if (!teamName) {
      if (debug) {
        addLog('[INFO] Demo mode - no backend connection');
      }
      return;
    }

    const initializeBackend = async () => {
      try {
        const basePath = path.join(process.env.HOME || '.', '.llm-orchestrator');
        const backend = createBackend({
          type: 'file',
          teamName,
          basePath,
        });

        await backend.initialize();
        backendRef.current = backend;

        setState(prev => ({
          ...prev,
          isConnected: true,
        }));

        addLog(`[INFO] Connected to backend for team: ${teamName}`);

        // Subscribe to task updates
        await backend.subscribe('tasks', (message: any) => {
          if (debug) {
            addLog(`[DEBUG] Received task update: ${JSON.stringify(message)}`);
          }

          // Refresh subtasks when updates are received
          refreshSubtasks();
        });

        // Subscribe to agent status updates
        await backend.subscribe('agents', (message: any) => {
          if (debug) {
            addLog(`[DEBUG] Received agent update: ${JSON.stringify(message)}`);
          }

          // Refresh subtasks when agent status changes
          refreshSubtasks();
        });

        // Load initial subtasks
        await refreshSubtasks();

      } catch (error) {
        const errorMessage = `Failed to initialize backend: ${error}`;
        console.error('[ERROR]', errorMessage);
        addLog(`[ERROR] ${errorMessage}`);
        setState(prev => ({
          ...prev,
          error: errorMessage,
        }));
      }
    };

    initializeBackend();

    return () => {
      if (backendRef.current) {
        backendRef.current.close().catch(console.error);
      }
    };
  }, [teamName, debug, addLog, refreshSubtasks]);

  return {
    state,
    addLog,
    clearLogs,
    refreshSubtasks,
  };
}
