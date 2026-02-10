/**
 * Task Manager - Manages subtasks and their states
 */

import { SubtaskWithDependencies, TaskStatus } from '../dependencies/types.js';
import { StorageBackend } from '../communication/interface.js';

export interface TaskManagerConfig {
  backend: StorageBackend;
  debug?: boolean;
}

export class TaskManager {
  private backend: StorageBackend;
  private debug: boolean;
  private messageIdCounter = 0;

  constructor(config: TaskManagerConfig) {
    this.backend = config.backend;
    this.debug = config.debug || false;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${this.messageIdCounter++}`;
  }

  /**
   * Initialize task manager
   */
  async initialize(): Promise<void> {
    if (this.debug) {
      console.log('[TaskManager] Initializing');
    }

    // Ensure subtasks state exists
    const existingSubtasks = await this.backend.getState('subtasks');
    if (!existingSubtasks) {
      await this.backend.setState('subtasks', []);
      if (this.debug) {
        console.log('[TaskManager] Initialized empty subtasks state');
      }
    }
  }

  /**
   * Get all subtasks
   */
  async getSubtasks(): Promise<SubtaskWithDependencies[]> {
    const subtasks = await this.backend.getState('subtasks');
    return subtasks || [];
  }

  /**
   * Get a specific subtask by ID
   */
  async getSubtask(id: string): Promise<SubtaskWithDependencies | null> {
    const subtasks = await this.getSubtasks();
    return subtasks.find(st => st.id === id) || null;
  }

  /**
   * Add a new subtask
   */
  async addSubtask(subtask: SubtaskWithDependencies): Promise<void> {
    const subtasks = await this.getSubtasks();
    const existing = subtasks.find(st => st.id === subtask.id);

    if (existing) {
      throw new Error(`Subtask with ID ${subtask.id} already exists`);
    }

    subtask.createdAt = Date.now();

    await this.backend.setState('subtasks', [...subtasks, subtask]);

    if (this.debug) {
      console.log(`[TaskManager] Added subtask: ${subtask.id} - ${subtask.description}`);
    }

    // Publish update
    await this.backend.publish('tasks', {
      id: this.generateId(),
      from: 'task-manager',
      to: '*',
      type: 'subtask_added',
      content: { subtask },
      timestamp: Date.now(),
      status: 'delivered',
    });
  }

  /**
   * Update an existing subtask
   */
  async updateSubtask(id: string, updates: Partial<SubtaskWithDependencies>): Promise<void> {
    const subtasks = await this.getSubtasks();
    const index = subtasks.findIndex(st => st.id === id);

    if (index === -1) {
      throw new Error(`Subtask with ID ${id} not found`);
    }

    const oldSubtask = subtasks[index];
    const newSubtask = { ...oldSubtask, ...updates };

    // Update timestamps based on status changes
    if (updates.status && updates.status !== oldSubtask.status) {
      if (updates.status === TaskStatus.IN_PROGRESS) {
        newSubtask.startedAt = Date.now();
      } else if (updates.status === TaskStatus.COMPLETED || updates.status === TaskStatus.FAILED) {
        newSubtask.completedAt = Date.now();
      }
    }

    subtasks[index] = newSubtask;
    await this.backend.setState('subtasks', subtasks);

    if (this.debug) {
      console.log(`[TaskManager] Updated subtask: ${id}`);
      console.log(`  Old status: ${oldSubtask.status}`);
      console.log(`  New status: ${newSubtask.status}`);
    }

    // Publish update
    await this.backend.publish('tasks', {
      id: this.generateId(),
      from: 'task-manager',
      to: '*',
      type: 'subtask_updated',
      content: { id, oldSubtask, newSubtask },
      timestamp: Date.now(),
      status: 'delivered',
    });
  }

  /**
   * Update subtask status
   */
  async updateSubtaskStatus(id: string, status: TaskStatus, progress?: number): Promise<void> {
    await this.updateSubtask(id, { status, progress });
  }

  /**
   * Update subtask progress
   */
  async updateSubtaskProgress(id: string, progress: number): Promise<void> {
    const subtask = await this.getSubtask(id);
    if (!subtask) {
      throw new Error(`Subtask with ID ${id} not found`);
    }

    await this.updateSubtask(id, {
      progress,
      status: progress === 100 ? TaskStatus.COMPLETED : subtask.status,
    });
  }

  /**
   * Delete a subtask
   */
  async deleteSubtask(id: string): Promise<void> {
    const subtasks = await this.getSubtasks();
    const filtered = subtasks.filter(st => st.id !== id);

    if (filtered.length === subtasks.length) {
      throw new Error(`Subtask with ID ${id} not found`);
    }

    await this.backend.setState('subtasks', filtered);

    if (this.debug) {
      console.log(`[TaskManager] Deleted subtask: ${id}`);
    }

    // Publish update
    await this.backend.publish('tasks', {
      id: this.generateId(),
      from: 'task-manager',
      to: '*',
      type: 'subtask_deleted',
      content: { id },
      timestamp: Date.now(),
      status: 'delivered',
    });
  }

  /**
   * Batch update subtasks
   */
  async updateSubtasks(updates: Array<{ id: string; updates: Partial<SubtaskWithDependencies> }>): Promise<void> {
    const subtasks = await this.getSubtasks();

    for (const { id, updates: taskUpdates } of updates) {
      const index = subtasks.findIndex(st => st.id === id);
      if (index !== -1) {
        const oldSubtask = subtasks[index];
        const newSubtask = { ...oldSubtask, ...taskUpdates };

        // Update timestamps based on status changes
        if (taskUpdates.status && taskUpdates.status !== oldSubtask.status) {
          if (taskUpdates.status === TaskStatus.IN_PROGRESS) {
            newSubtask.startedAt = Date.now();
          } else if (taskUpdates.status === TaskStatus.COMPLETED || taskUpdates.status === TaskStatus.FAILED) {
            newSubtask.completedAt = Date.now();
          }
        }

        subtasks[index] = newSubtask;
      }
    }

    await this.backend.setState('subtasks', subtasks);

    if (this.debug) {
      console.log(`[TaskManager] Batch updated ${updates.length} subtasks`);
    }

    // Publish update
    await this.backend.publish('tasks', {
      id: this.generateId(),
      from: 'task-manager',
      to: '*',
      type: 'subtasks_updated',
      content: { updates },
      timestamp: Date.now(),
      status: 'delivered',
    });
  }

  /**
   * Get subtasks by agent
   */
  async getSubtasksByAgent(agentId: string): Promise<SubtaskWithDependencies[]> {
    const subtasks = await this.getSubtasks();
    return subtasks.filter(st => st.assignedTo === agentId);
  }

  /**
   * Get subtasks by status
   */
  async getSubtasksByStatus(status: TaskStatus): Promise<SubtaskWithDependencies[]> {
    const subtasks = await this.getSubtasks();
    return subtasks.filter(st => st.status === status);
  }

  /**
   * Clear all subtasks
   */
  async clearSubtasks(): Promise<void> {
    await this.backend.setState('subtasks', []);

    if (this.debug) {
      console.log('[TaskManager] Cleared all subtasks');
    }

    // Publish update
    await this.backend.publish('tasks', {
      id: this.generateId(),
      from: 'task-manager',
      to: '*',
      type: 'subtasks_cleared',
      content: {},
      timestamp: Date.now(),
      status: 'delivered',
    });
  }
}
