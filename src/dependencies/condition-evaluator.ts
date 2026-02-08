/**
 * Condition Evaluator
 * Evaluates whether a conditional dependency should allow execution
 */

import { ConditionalDependency, ExecutionCondition, TaskStatus } from './types.js';

/**
 * Normalize dependency to ConditionalDependency format
 */
export function normalizeDependency(dep: string | ConditionalDependency): ConditionalDependency {
  if (typeof dep === 'string') {
    return { taskId: dep, condition: 'success' };  // Default: execute on success
  }
  return dep;
}

/**
 * Evaluate whether a dependency condition is met
 */
export function evaluateCondition(
  dependency: ConditionalDependency,
  depStatus: TaskStatus,
  depResult?: any
): boolean {
  const { condition } = dependency;

  // Status-based condition
  if (typeof condition === 'string') {
    switch (condition) {
      case 'success':
        return depStatus === 'completed';
      case 'failure':
        return depStatus === 'failed';
      case 'any':
        return depStatus === 'completed' || depStatus === 'failed' || depStatus === 'skipped';
      default:
        throw new Error(`Unknown execution condition: ${condition}`);
    }
  }

  // Output-based condition (function)
  if (typeof condition === 'function') {
    try {
      return condition(depResult);
    } catch (error) {
      console.error(`Error evaluating output-based condition:`, error);
      return false;
    }
  }

  throw new Error(`Invalid condition type for dependency ${dependency.taskId}`);
}

/**
 * Check if all dependencies are ready for execution
 */
export function areDependenciesReady(
  dependencies: (string | ConditionalDependency)[],
  getDepStatus: (taskId: string) => { status: TaskStatus; result?: any }
): boolean {
  for (const dep of dependencies) {
    const normalized = normalizeDependency(dep);
    const depInfo = getDepStatus(normalized.taskId);

    // If dependency is not finished, not ready
    if (
      depInfo.status !== 'completed' &&
      depInfo.status !== 'failed' &&
      depInfo.status !== 'skipped'
    ) {
      return false;
    }

    // Check condition
    if (!evaluateCondition(normalized, depInfo.status, depInfo.result)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a dependency would block execution
 */
export function isDependencyBlocking(
  dependency: ConditionalDependency,
  depStatus: TaskStatus,
  depResult?: any
): boolean {
  // If dependency is finished, check condition
  if (
    depStatus === 'completed' ||
    depStatus === 'failed' ||
    depStatus === 'skipped'
  ) {
    return !evaluateCondition(dependency, depStatus, depResult);
  }

  // If dependency is not finished, it blocks
  return true;
}

/**
 * Get reason why dependencies are not ready
 */
export function getDependencyBlockageReason(
  dependencies: (string | ConditionalDependency)[],
  getDepStatus: (taskId: string) => { status: TaskStatus; result?: any }
): string | null {
  for (const dep of dependencies) {
    const normalized = normalizeDependency(dep);
    const depInfo = getDepStatus(normalized.taskId);

    if (
      depInfo.status === 'in_progress' ||
      depInfo.status === 'waiting' ||
      depInfo.status === 'pending' ||
      depInfo.status === 'ready'
    ) {
      return `Waiting for task ${normalized.taskId} to complete`;
    }

    if (!evaluateCondition(normalized, depInfo.status, depInfo.result)) {
      const conditionStr = typeof normalized.condition === 'string'
        ? normalized.condition
        : 'output-based condition';
      return `Condition not met: task ${normalized.taskId} did not satisfy ${conditionStr}`;
    }
  }

  return null;
}
