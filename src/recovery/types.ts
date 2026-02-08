/**
 * Types for error recovery system
 */

/**
 * Retry backoff type
 */
export type BackoffType = 'linear' | 'exponential';

/**
 * Error handling strategy
 */
export type ErrorStrategy = 'continue' | 'stop' | 'ask';

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;  // milliseconds
  maxDelay: number;     // milliseconds
  backoff: BackoffType;
}

/**
 * Error information
 */
export interface ErrorInfo {
  subtaskId: string;
  agentId: string;
  error: Error;
  timestamp: number;
  retryCount: number;
  lastRetryAt?: number;
}

/**
 * Recovery action type
 */
export type RecoveryAction =
  | { type: 'retry' }
  | { type: 'reassign'; newAgentId: string }
  | { type: 'split'; newSubtasks: string[] }
  | { type: 'skip' }
  | { type: 'manual_intervention'; reason: string };

/**
 * Subtask info for splitting
 */
export interface SubtaskForSplitting {
  id: string;
  description: string;
}

/**
 * Error handler result
 */
export interface ErrorHandlerResult {
  action: RecoveryAction;
  shouldRetry: boolean;
  delay?: number;
}

/**
 * Error severity
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
