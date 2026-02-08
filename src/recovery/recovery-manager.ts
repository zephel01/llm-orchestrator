/**
 * Recovery Manager
 * Handles error recovery using retry policies and strategies
 */

import { ErrorInfo, RecoveryAction, ErrorHandlerResult, ErrorStrategy, SubtaskForSplitting, ErrorSeverity } from './types.js';
import { RetryPolicyManager } from './retry-policy.js';
import { ErrorDetector } from './error-detector.js';

export class RecoveryManager {
  private retryPolicy: RetryPolicyManager;
  private errorDetector: ErrorDetector;
  private strategy: ErrorStrategy;
  private errorHistory: Map<string, ErrorInfo[]>;

  constructor(
    retryPolicy: RetryPolicyManager,
    strategy: ErrorStrategy = 'continue'
  ) {
    this.retryPolicy = retryPolicy;
    this.errorDetector = new ErrorDetector();
    this.strategy = strategy;
    this.errorHistory = new Map();
  }

  /**
   * Handle an error for a subtask
   */
  async handleError(errorInfo: ErrorInfo): Promise<ErrorHandlerResult> {
    // Record error in history
    this.recordError(errorInfo);

    // Check if we should retry
    if (this.shouldRetry(errorInfo)) {
      const delay = this.retryPolicy.calculateDelay(errorInfo.retryCount);

      return {
        action: { type: 'retry' },
        shouldRetry: true,
        delay
      };
    }

    // Determine action based on strategy
    return this.determineAction(errorInfo);
  }

  /**
   * Determine recovery action based on strategy and error
   */
  private determineAction(errorInfo: ErrorInfo): ErrorHandlerResult {
    const isRecoverable = this.errorDetector.isRecoverable(errorInfo.error);
    const severity = this.errorDetector.getSeverity(errorInfo.error);

    // Critical errors should always stop
    if (severity === ErrorSeverity.CRITICAL) {
      return {
        action: { type: 'manual_intervention', reason: 'Critical error detected' },
        shouldRetry: false
      };
    }

    // Based on strategy
    switch (this.strategy) {
      case 'continue':
        // Skip failed task and continue
        return {
          action: { type: 'skip' },
          shouldRetry: false
        };

      case 'stop':
        // Stop execution on error
        return {
          action: { type: 'manual_intervention', reason: 'Error occurred and stop strategy is set' },
          shouldRetry: false
        };

      case 'ask':
        // Ask for user intervention
        return {
          action: { type: 'manual_intervention', reason: 'User intervention requested' },
          shouldRetry: false
        };

      default:
        return {
          action: { type: 'skip' },
          shouldRetry: false
        };
    }
  }

  /**
   * Check if we should retry based on retry policy and error type
   */
  private shouldRetry(errorInfo: ErrorInfo): boolean {
    const isRecoverable = this.errorDetector.isRecoverable(errorInfo.error);

    if (!isRecoverable) {
      return false;
    }

    return this.retryPolicy.shouldRetry(errorInfo.retryCount);
  }

  /**
   * Record error in history
   */
  private recordError(errorInfo: ErrorInfo): void {
    const history = this.errorHistory.get(errorInfo.subtaskId) || [];
    history.push(errorInfo);
    this.errorHistory.set(errorInfo.subtaskId, history);
  }

  /**
   * Get error history for a subtask
   */
  getErrorHistory(subtaskId: string): ErrorInfo[] {
    return this.errorHistory.get(subtaskId) || [];
  }

  /**
   * Clear error history for a subtask
   */
  clearErrorHistory(subtaskId: string): void {
    this.errorHistory.delete(subtaskId);
  }

  /**
   * Clear all error history
   */
  clearAllErrorHistory(): void {
    this.errorHistory.clear();
  }

  /**
   * Update error strategy
   */
  setStrategy(strategy: ErrorStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Get current error strategy
   */
  getStrategy(): ErrorStrategy {
    return this.strategy;
  }

  /**
   * Update retry policy
   */
  setRetryPolicy(policy: RetryPolicyManager): void {
    this.retryPolicy = policy;
  }

  /**
   * Get retry policy
   */
  getRetryPolicy(): RetryPolicyManager {
    return this.retryPolicy;
  }

  /**
   * Reassign subtask to a different agent
   */
  reassignSubtask(subtaskId: string, newAgentId: string): RecoveryAction {
    return {
      type: 'reassign',
      newAgentId
    };
  }

  /**
   * Split a subtask into smaller subtasks
   * This is a simplified implementation that just returns the split suggestion
   */
  splitSubtask(subtask: SubtaskForSplitting): RecoveryAction {
    // In a real implementation, this would analyze the subtask and split it intelligently
    // For now, we just suggest that manual intervention is needed
    return {
      type: 'manual_intervention',
      reason: `Subtask splitting requested for ${subtask.id}: ${subtask.description}`
    };
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    totalErrors: number;
    errorsBySubtask: Map<string, number>;
    errorsByAgent: Map<string, number>;
  } {
    const errorsBySubtask = new Map<string, number>();
    const errorsByAgent = new Map<string, number>();
    let totalErrors = 0;

    for (const errors of this.errorHistory.values()) {
      for (const error of errors) {
        totalErrors++;
        errorsBySubtask.set(error.subtaskId, (errorsBySubtask.get(error.subtaskId) || 0) + 1);
        errorsByAgent.set(error.agentId, (errorsByAgent.get(error.agentId) || 0) + 1);
      }
    }

    return {
      totalErrors,
      errorsBySubtask,
      errorsByAgent
    };
  }
}
