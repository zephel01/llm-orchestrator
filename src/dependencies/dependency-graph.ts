/**
 * Dependency Graph (DAG - Directed Acyclic Graph)
 * Manages the dependency relationships between subtasks
 */

import { SubtaskWithDependencies, DependencyNode, CycleResult } from './types.js';

export class DependencyGraph {
  private nodes: Map<string, DependencyNode>;

  constructor() {
    this.nodes = new Map();
  }

  /**
   * Add a subtask to the graph
   */
  addSubtask(subtask: SubtaskWithDependencies): void {
    if (this.nodes.has(subtask.id)) {
      throw new Error(`Subtask with id ${subtask.id} already exists`);
    }

    const node: DependencyNode = {
      subtask,
      dependents: [],
      indegree: subtask.dependencies.length
    };

    this.nodes.set(subtask.id, node);

    // Update dependents of dependencies
    for (const depId of subtask.dependencies) {
      const depNode = this.nodes.get(depId);
      if (depNode) {
        depNode.dependents.push(subtask.id);
      }
    }
  }

  /**
   * Get a subtask by ID
   */
  getSubtask(id: string): SubtaskWithDependencies | undefined {
    return this.nodes.get(id)?.subtask;
  }

  /**
   * Update subtask status
   */
  updateStatus(id: string, status: SubtaskWithDependencies['status']): void {
    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Subtask with id ${id} not found`);
    }

    node.subtask.status = status;

    // Update timestamps
    const now = Date.now();
    if (status === 'in_progress' && !node.subtask.startedAt) {
      node.subtask.startedAt = now;
    } else if (status === 'completed' || status === 'failed' || status === 'skipped') {
      node.subtask.completedAt = now;
    }
  }

  /**
   * Detect cycles in the graph using DFS
   */
  detectCycle(): CycleResult {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string, currentPath: string[]): string[] | null => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      currentPath.push(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        for (const depId of node.subtask.dependencies) {
          if (!visited.has(depId)) {
            const cycle = dfs(depId, currentPath);
            if (cycle) {
              return cycle;
            }
          } else if (recursionStack.has(depId)) {
            // Cycle found: extract the cycle path
            const cycleStart = currentPath.indexOf(depId);
            const cycle = currentPath.slice(cycleStart);
            return cycle;
          }
        }
      }

      currentPath.pop();
      recursionStack.delete(nodeId);
      return null;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const cycle = dfs(nodeId, []);
        if (cycle) {
          return { hasCycle: true, cycle };
        }
      }
    }

    return { hasCycle: false };
  }

  /**
   * Get nodes that depend on the given subtask
   */
  getDependents(subtaskId: string): string[] {
    const node = this.nodes.get(subtaskId);
    return node ? [...node.dependents] : [];
  }

  /**
   * Get all nodes
   */
  getAllNodes(): Map<string, DependencyNode> {
    return new Map(this.nodes);
  }

  /**
   * Get total number of subtasks
   */
  size(): number {
    return this.nodes.size;
  }

  /**
   * Check if graph is empty
   */
  isEmpty(): boolean {
    return this.nodes.size === 0;
  }

  /**
   * Get all subtasks
   */
  getAllSubtasks(): SubtaskWithDependencies[] {
    return Array.from(this.nodes.values()).map(node => node.subtask);
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.nodes.clear();
  }
}
