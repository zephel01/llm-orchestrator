/**
 * Error Detector
 * Detects and classifies errors
 */

import { ErrorInfo, ErrorSeverity } from './types.js';

export class ErrorDetector {
  /**
   * Detect if an error is recoverable
   */
  isRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network errors are usually recoverable
    if (message.includes('econnreset') ||
        message.includes('etimedout') ||
        message.includes('econnrefused')) {
      return true;
    }

    // Timeout errors are recoverable
    if (message.includes('timeout') || message.includes('timed out')) {
      return true;
    }

    // Rate limit errors are recoverable
    if (message.includes('rate limit')) {
      return true;
    }

    // Unknown errors may or may not be recoverable
    return false;
  }

  /**
   * Get error severity
   */
  getSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();

    // Critical errors
    if (message.includes('fatal') ||
        message.includes('critical') ||
        message.includes('disk full') ||
        message.includes('out of memory')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity (including critical keyword in the error message)
    if (message.includes('critical') ||
        message.includes('permission denied') ||
        message.includes('access denied') ||
        message.includes('security')) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity
    if (message.includes('timeout') ||
        message.includes('rate limit')) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity (network issues, etc.)
    return ErrorSeverity.LOW;
  }

  /**
   * Create error info from an error
   */
  createErrorInfo(
    subtaskId: string,
    agentId: string,
    error: Error,
    retryCount: number = 0
  ): ErrorInfo {
    return {
      subtaskId,
      agentId,
      error,
      timestamp: Date.now(),
      retryCount
    };
  }

  /**
   * Check if error is a timeout
   */
  isTimeout(error: Error): boolean {
    return error.message.toLowerCase().includes('timeout') ||
           error.message.toLowerCase().includes('timed out');
  }

  /**
   * Check if error is a network error
   */
  isNetworkError(error: Error): boolean {
    return error.message.includes('ECONNRESET') ||
           error.message.includes('ETIMEDOUT') ||
           error.message.includes('ECONNREFUSED');
  }

  /**
   * Check if error is a rate limit
   */
  isRateLimit(error: Error): boolean {
    return error.message.toLowerCase().includes('rate limit');
  }
}
