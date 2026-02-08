/**
 * Dependency Manager
 * Manages subtask dependencies and determines execution order
 */

import { DependencyGraph } from './dependency-graph.js';
import { TopologicalSort } from './topological-sort.js';
import { SubtaskWithDependencies, TaskStatus, SubtaskStatus, CycleResult } from './types.js';

export class DependencyManager {
  private graph: DependencyGraph;
  private topologicalSort: TopologicalSort;

  constructor() {
    this.graph = new DependencyGraph();
    this.topologicalSort = new TopologicalSort(this.graph);
  }

  /**
   * Add a subtask with dependencies
   */
  addSubtask(subtask: SubtaskWithDependencies): void {
    this.graph.addSubtask(subtask);
  }

  /**
   * Update subtask status
   */
  updateStatus(subtaskId: string, status: TaskStatus): void {
    this.graph.updateStatus(subtaskId, status);
  }

  /**
   * Detect cycles in the dependency graph
   */
  detectCycle(): CycleResult {
    return this.graph.detectCycle();
  }

  /**
   * Get execution order (topological sort)
   */
  getExecutionOrder(): string[] {
    return this.topologicalSort.getExecutionOrder();
  }

  /**
   * Get parallel execution levels
   * Returns array of arrays, where each inner array contains tasks that can run in parallel
   */
  getParallelLevels(): string[][] {
    return this.topologicalSort.getParallelLevels();
  }

  /**
   * Get subtasks that are ready to execute
   * (all dependencies completed)
   */
  getReadySubtasks(): SubtaskWithDependencies[] {
    const allSubtasks = this.graph.getAllSubtasks();
    return allSubtasks.filter(subtask => {
      // Check if all dependencies are completed
      const allDepsCompleted = subtask.dependencies.every(depId => {
        const dep = this.graph.getSubtask(depId);
        return dep?.status === TaskStatus.COMPLETED;
      });

      // Also check status is pending or waiting
      return (subtask.status === TaskStatus.PENDING ||
              subtask.status === TaskStatus.WAITING) &&
             allDepsCompleted;
    });
  }

  /**
   * Get subtasks that are currently waiting for dependencies
   */
  getWaitingSubtasks(): SubtaskWithDependencies[] {
    const allSubtasks = this.graph.getAllSubtasks();
    return allSubtasks.filter(subtask => {
      const hasUncompletedDeps = subtask.dependencies.some(depId => {
        const dep = this.graph.getSubtask(depId);
        return dep?.status !== TaskStatus.COMPLETED;
      });

      return subtask.status === TaskStatus.PENDING && hasUncompletedDeps;
    });
  }

  /**
   * Get subtask status
   */
  getSubtaskStatus(subtaskId: string): SubtaskStatus | undefined {
    const subtask = this.graph.getSubtask(subtaskId);
    if (!subtask) {
      return undefined;
    }

    return {
      id: subtask.id,
      description: subtask.description,
      status: subtask.status,
      dependencies: subtask.dependencies,
      assignedTo: subtask.assignedTo
    };
  }

  /**
   * Get all subtask statuses
   */
  getAllSubtaskStatuses(): SubtaskStatus[] {
    const allSubtasks = this.graph.getAllSubtasks();
    return allSubtasks.map(subtask => ({
      id: subtask.id,
      description: subtask.description,
      status: subtask.status,
      dependencies: subtask.dependencies,
      assignedTo: subtask.assignedTo
    }));
  }

  /**
   * Mark a subtask as completed
   */
  markCompleted(subtaskId: string): void {
    this.updateStatus(subtaskId, TaskStatus.COMPLETED);
  }

  /**
   * Mark a subtask as failed
   */
  markFailed(subtaskId: string): void {
    this.updateStatus(subtaskId, TaskStatus.FAILED);
  }

  /**
   * Mark a subtask as skipped
   */
  markSkipped(subtaskId: string): void {
    this.updateStatus(subtaskId, TaskStatus.SKIPPED);
  }

  /**
   * Get subtasks that depend on the given subtask
   */
  getDependents(subtaskId: string): string[] {
    return this.graph.getDependents(subtaskId);
  }

  /**
   * Get total number of subtasks
   */
  getTotalSubtasks(): number {
    return this.graph.size();
  }

  /**
   * Get count of subtasks by status
   */
  getSubtasksByStatus(): { [key in TaskStatus]: number } {
    const allSubtasks = this.graph.getAllSubtasks();
    const counts = {
      [TaskStatus.PENDING]: 0,
      [TaskStatus.WAITING]: 0,
      [TaskStatus.READY]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.COMPLETED]: 0,
      [TaskStatus.FAILED]: 0,
      [TaskStatus.SKIPPED]: 0
    };

    for (const subtask of allSubtasks) {
      counts[subtask.status]++;
    }

    return counts;
  }

  /**
   * Check if all subtasks are completed
   */
  isAllCompleted(): boolean {
    const allSubtasks = this.graph.getAllSubtasks();
    return allSubtasks.every(subtask =>
      subtask.status === TaskStatus.COMPLETED ||
      subtask.status === TaskStatus.SKIPPED
    );
  }

  /**
   * Check if there are any failed subtasks
   */
  hasFailedSubtasks(): boolean {
    const allSubtasks = this.graph.getAllSubtasks();
    return allSubtasks.some(subtask => subtask.status === TaskStatus.FAILED);
  }

  /**
   * Get execution summary
   */
  getExecutionSummary(): {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    waiting: number;
    pending: number;
    percentage: number;
  } {
    const counts = this.getSubtasksByStatus();
    const total = this.getTotalSubtasks();
    const completed = counts[TaskStatus.COMPLETED] + counts[TaskStatus.SKIPPED];
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      failed: counts[TaskStatus.FAILED],
      inProgress: counts[TaskStatus.IN_PROGRESS],
      waiting: counts[TaskStatus.WAITING],
      pending: counts[TaskStatus.PENDING],
      percentage
    };
  }

  /**
   * Clear all subtasks
   */
  clear(): void {
    this.graph.clear();
  }

  /**
   * Get the dependency graph (for debugging/visualization)
   */
  getGraph(): DependencyGraph {
    return this.graph;
  }
}
