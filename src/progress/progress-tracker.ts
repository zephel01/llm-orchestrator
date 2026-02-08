/**
 * Progress Tracker
 * Tracks progress of subtasks and agents
 */

import { SubtaskInfo, TaskStatus, ProgressState } from './types.js';

export class ProgressTracker {
  private subtasks: Map<string, SubtaskInfo>;
  private activeAgents: number;
  private monitoringInterval: number | null;

  constructor() {
    this.subtasks = new Map();
    this.activeAgents = 0;
    this.monitoringInterval = null;
  }

  /**
   * Add a subtask
   */
  addSubtask(subtask: SubtaskInfo): void {
    this.subtasks.set(subtask.id, { ...subtask });
  }

  /**
   * Update subtask status
   */
  updateSubtask(subtaskId: string, updates: Partial<SubtaskInfo>): void {
    const subtask = this.subtasks.get(subtaskId);
    if (!subtask) {
      throw new Error(`Subtask ${subtaskId} not found`);
    }

    this.subtasks.set(subtaskId, { ...subtask, ...updates });
  }

  /**
   * Set subtask status
   */
  setSubtaskStatus(subtaskId: string, status: TaskStatus): void {
    this.updateSubtask(subtaskId, { status });
  }

  /**
   * Set subtask progress
   */
  setSubtaskProgress(subtaskId: string, progress: number): void {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    this.updateSubtask(subtaskId, { progress });
  }

  /**
   * Set active agent count
   */
  setActiveAgents(count: number): void {
    this.activeAgents = count;
  }

  /**
   * Get current progress state
   */
  getState(): ProgressState {
    const subtasks = Array.from(this.subtasks.values());

    const completed = subtasks.filter(s =>
      s.status === TaskStatus.COMPLETED || s.status === TaskStatus.SKIPPED
    ).length;

    const inProgress = subtasks.filter(s =>
      s.status === TaskStatus.IN_PROGRESS
    ).length;

    const waiting = subtasks.filter(s =>
      s.status === TaskStatus.WAITING || s.status === TaskStatus.PENDING
    ).length;

    const failed = subtasks.filter(s =>
      s.status === TaskStatus.FAILED
    ).length;

    const progressPercentage = subtasks.length > 0
      ? Math.round((completed / subtasks.length) * 100)
      : 0;

    return {
      totalSubtasks: subtasks.length,
      completedSubtasks: completed,
      inProgressSubtasks: inProgress,
      waitingSubtasks: waiting,
      failedSubtasks: failed,
      progressPercentage,
      activeAgents: this.activeAgents,
      subtasks,
      timestamp: Date.now()
    };
  }

  /**
   * Start monitoring progress
   */
  startMonitoring(intervalMs: number, callback: (state: ProgressState) => void): void {
    if (this.monitoringInterval !== null) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      callback(this.getState());
    }, intervalMs) as unknown as number;
  }

  /**
   * Stop monitoring progress
   */
  stopMonitoring(): void {
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Get subtask info
   */
  getSubtask(subtaskId: string): SubtaskInfo | undefined {
    return this.subtasks.get(subtaskId);
  }

  /**
   * Get all subtasks
   */
  getAllSubtasks(): SubtaskInfo[] {
    return Array.from(this.subtasks.values());
  }

  /**
   * Clear all subtasks
   */
  clear(): void {
    this.stopMonitoring();
    this.subtasks.clear();
    this.activeAgents = 0;
  }

  /**
   * Check if all subtasks are completed
   */
  isAllCompleted(): boolean {
    return Array.from(this.subtasks.values()).every(s =>
      s.status === TaskStatus.COMPLETED || s.status === TaskStatus.SKIPPED
    );
  }
}
