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
}

interface UseBackendMonitoringReturn {
  state: BackendMonitoringState;
  addLog: (message: string) => void;
  clearLogs: () => void;
}

export function useBackendMonitoring(
  options: UseBackendMonitoringOptions
): UseBackendMonitoringReturn {
  const { teamName, debug = false } = options;

  const [state, setState] = useState<BackendMonitoringState>({
    subtasks: [],
    isConnected: false,
    lastUpdate: null,
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

          // TODO: Process actual task updates
          // For now, we'll just log them
          setState(prev => ({
            ...prev,
            lastUpdate: new Date(),
          }));
        });

      } catch (error) {
        console.error('[ERROR] Failed to initialize backend:', error);
        addLog(`[ERROR] Failed to connect to backend: ${error}`);
      }
    };

    initializeBackend();

    return () => {
      if (backendRef.current) {
        backendRef.current.close().catch(console.error);
      }
    };
  }, [teamName, debug, addLog]);

  return {
    state,
    addLog,
    clearLogs,
  };
}
