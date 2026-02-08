/**
 * Topological Sort (Kahn's Algorithm)
 * Determines the execution order of subtasks based on dependencies
 */

import { DependencyGraph } from './dependency-graph.js';
import { ExecutionOrder } from './types.js';

export class TopologicalSort {
  constructor(private graph: DependencyGraph) {}

  /**
   * Perform topological sort using Kahn's algorithm
   * Returns execution order and parallel levels
   */
  sort(): ExecutionOrder {
    const nodes = this.graph.getAllNodes();
    const order: string[] = [];
    const parallelLevels: string[][] = [];

    if (nodes.size === 0) {
      return { order: [], parallelLevels: [] };
    }

    // Initialize indegrees
    const indegree = new Map<string, number>();
    for (const [id, node] of nodes) {
      indegree.set(id, node.indegree);
    }

    // Find all nodes with indegree 0
    const queue: string[] = [];
    for (const [id, node] of nodes) {
      if (node.indegree === 0) {
        queue.push(id);
      }
    }

    // If no nodes with indegree 0, there's a cycle
    if (queue.length === 0 && nodes.size > 0) {
      throw new Error('Graph contains a cycle and cannot be topologically sorted');
    }

    // Process nodes
    let currentLevel: string[] = [];

    while (queue.length > 0) {
      // Get current level (all nodes that can run in parallel)
      const levelSize = queue.length;
      currentLevel = queue.splice(0, levelSize);
      parallelLevels.push([...currentLevel]);

      // Process each node in current level
      for (const nodeId of currentLevel) {
        order.push(nodeId);

        // Update indegree of neighbors
        const node = nodes.get(nodeId);
        if (node) {
          for (const depId of node.dependents) {
            const currentIndegree = indegree.get(depId)!;
            indegree.set(depId, currentIndegree - 1);

            // If indegree becomes 0, add to queue
            if (indegree.get(depId) === 0) {
              queue.push(depId);
            }
          }
        }
      }
    }

    // Check if all nodes were processed (cycle detection)
    if (order.length !== nodes.size) {
      throw new Error('Graph contains a cycle and cannot be topologically sorted');
    }

    return { order, parallelLevels };
  }

  /**
   * Get only the execution order without parallel levels
   */
  getExecutionOrder(): string[] {
    return this.sort().order;
  }

  /**
   * Get parallel execution levels
   * Each level contains tasks that can be executed concurrently
   */
  getParallelLevels(): string[][] {
    return this.sort().parallelLevels;
  }
}
