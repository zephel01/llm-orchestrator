/**
 * Retry Policy
 * Calculates retry delay based on backoff strategy
 */

import { RetryPolicy, BackoffType } from './types.js';

export class RetryPolicyManager {
  private policy: RetryPolicy;

  constructor(policy: RetryPolicy) {
    this.policy = { ...policy };
  }

  /**
   * Calculate delay for a given retry attempt
   */
  calculateDelay(retryCount: number): number {
    if (retryCount <= 0) {
      return this.policy.initialDelay;
    }

    if (retryCount > this.policy.maxRetries) {
      throw new Error(`Retry count ${retryCount} exceeds maximum ${this.policy.maxRetries}`);
    }

    let delay: number;

    switch (this.policy.backoff) {
      case 'linear':
        delay = this.policy.initialDelay * (retryCount + 1);
        break;

      case 'exponential':
        delay = this.policy.initialDelay * Math.pow(2, retryCount);
        break;

      default:
        delay = this.policy.initialDelay;
    }

    // Cap at max delay
    return Math.min(delay, this.policy.maxDelay);
  }

  /**
   * Check if we should retry
   */
  shouldRetry(retryCount: number): boolean {
    return retryCount < this.policy.maxRetries;
  }

  /**
   * Get the retry policy
   */
  getPolicy(): RetryPolicy {
    return { ...this.policy };
  }

  /**
   * Update the retry policy
   */
  updatePolicy(newPolicy: Partial<RetryPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy };
  }

  /**
   * Reset retry count for a new attempt
   */
  reset(): void {
    // Policy doesn't need reset, just a conceptual method
  }

  /**
   * Create default retry policy
   */
  static createDefault(): RetryPolicyManager {
    return new RetryPolicyManager({
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 60000,
      backoff: 'exponential'
    });
  }

  /**
   * Create custom retry policy
   */
  static createCustom(config: Partial<RetryPolicy>): RetryPolicyManager {
    const defaults = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 60000,
      backoff: 'exponential' as BackoffType
    };

    return new RetryPolicyManager({ ...defaults, ...config });
  }
}
