/**
 * Types for progress tracking system
 */

/**
 * Task status
 */
export enum TaskStatus {
  PENDING = 'pending',
  WAITING = 'waiting',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

/**
 * Subtask information
 */
export interface SubtaskInfo {
  id: string;
  description: string;
  status: TaskStatus;
  assignedTo?: string;
  progress?: number;  // 0-100
  error?: string;
}

/**
 * Progress state
 */
export interface ProgressState {
  totalSubtasks: number;
  completedSubtasks: number;
  inProgressSubtasks: number;
  waitingSubtasks: number;
  failedSubtasks: number;
  progressPercentage: number;
  activeAgents: number;
  subtasks: SubtaskInfo[];
  timestamp: number;
}

/**
 * Progress format type
 */
export type ProgressFormat = 'inline' | 'progress' | 'json';

/**
 * Progress formatter interface
 */
export interface ProgressFormatter {
  format(state: ProgressState): string;
}
