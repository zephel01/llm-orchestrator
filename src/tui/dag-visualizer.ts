/**
 * DAG Visualizer
 * ASCII/Unicode-based dependency graph visualization
 */

import { SubtaskWithDependencies, TaskStatus } from '../dependencies/types.js';

// DAG Visualization Options
interface DAGOptions {
  width?: number;
  showStatus?: boolean;
  compact?: boolean;
}

// DAG Visualization Component
export interface DAGVisualization {
  lines: string[];
  width: number;
}

/**
 * Generate ASCII/Unicode DAG visualization
 */
export class DAGVisualizer {
  constructor(private options: DAGOptions = {}) {
    this.options = {
      width: 80,
      showStatus: true,
      compact: false,
      ...options
    };
  }

  /**
   * Generate DAG visualization
   */
  visualize(subtasks: SubtaskWithDependencies[]): DAGVisualization {
    if (subtasks.length === 0) {
      return { lines: ['No subtasks to display'], width: 25 };
    }

    const levels = this.calculateLevels(subtasks);
    const lines: string[] = [];

    // Add header
    lines.push('Dependency Graph:');
    lines.push(''.padEnd(this.options.width!, '─'));

    // Generate visualization by levels
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const isLastLevel = i === levels.length - 1;
      const levelLine = this.renderLevel(level, i, isLastLevel);
      lines.push(...levelLine);
    }

    return { lines, width: this.options.width! };
  }

  /**
   * Calculate execution levels for topological display
   */
  private calculateLevels(subtasks: SubtaskWithDependencies[]): SubtaskWithDependencies[][] {
    const levels: SubtaskWithDependencies[][] = [];
    const remaining = new Map(
      subtasks.map(st => [st.id, { subtask: st, indegree: st.dependencies.length }])
    );
    const processed = new Set<string>();

    while (remaining.size > 0) {
      const currentLevel: SubtaskWithDependencies[] = [];

      // Find tasks with no remaining dependencies or met conditions
      for (const [id, info] of remaining) {
        if (info.indegree === 0) {
          currentLevel.push(info.subtask);
        }
      }

      if (currentLevel.length === 0 && remaining.size > 0) {
        // Circular dependency or unmet conditions
        // Add remaining tasks as last level
        levels.push(Array.from(remaining.values()).map(info => info.subtask));
        break;
      }

      // Add current level
      levels.push(currentLevel);

      // Update indegrees for next level
      for (const st of currentLevel) {
        processed.add(st.id);
        remaining.delete(st.id);

        // Decrease indegree of dependents
        for (const dep of st.dependencies) {
          const depId = typeof dep === 'string' ? dep : dep.taskId;
          const depInfo = remaining.get(depId);
          if (depInfo) {
            depInfo.indegree--;
          }
        }
      }
    }

    return levels;
  }

  /**
   * Render a single level of the DAG
   */
  private renderLevel(
    level: SubtaskWithDependencies[],
    levelIndex: number,
    isLast: boolean
  ): string[] {
    const lines: string[] = [];

    if (level.length === 0) {
      return lines;
    }

    // Calculate layout
    const levelHeight = Math.max(3, level.length * 2 + 1);
    const boxWidth = Math.floor((this.options.width! - 4) / level.length) - 1;

    // Render each task in the level
    const taskLines: string[][] = Array.from({ length: levelHeight }, () => []);
    const taskPositions: number[] = [];

    for (let i = 0; i < level.length; i++) {
      const subtask = level[i];
      const boxLines = this.renderTaskBox(subtask, boxWidth);
      const position = (i * (boxWidth + 2)) + 2;

      // Position the box vertically centered
      const startY = Math.floor((levelHeight - boxLines.length) / 2);

      for (let j = 0; j < levelHeight; j++) {
        if (j >= startY && j < startY + boxLines.length) {
          taskLines[j].push(boxLines[j - startY]);
        } else {
          taskLines[j].push(''.padEnd(boxWidth));
        }
      }

      taskPositions.push(position);
    }

    // Combine task lines
    for (const line of taskLines) {
      lines.push(line.join(' '));
    }

    // Add connection lines to next level
    if (!isLast) {
      lines.push('│'.repeat(this.options.width! - 2).padStart(this.options.width! - 1, ' '));
    }

    return lines;
  }

  /**
   * Render a single task box
   */
  private renderTaskBox(subtask: SubtaskWithDependencies, maxWidth: number): string[] {
    const statusColor = this.getStatusSymbol(subtask.status);
    const statusText = this.getStatusText(subtask.status);

    const truncatedDesc = this.truncate(subtask.description, maxWidth - 4);

    const lines: string[] = [];

    // Top border
    lines.push('┌' + '─'.repeat(maxWidth - 2) + '┐');

    // Task ID and status (only if showStatus is true)
    if (this.options.showStatus) {
      lines.push('│ ' + statusColor + ' ' + statusText + ' '.repeat(maxWidth - 6 - statusText.length) + '│');
    } else {
      lines.push('│ ' + truncatedDesc.padEnd(maxWidth - 4) + ' │');
    }

    // Description (may wrap) - only if showStatus is true
    if (this.options.showStatus) {
      const descLines = this.wrapText(truncatedDesc, maxWidth - 4);
      for (const line of descLines) {
        lines.push('│ ' + line.padEnd(maxWidth - 4) + ' │');
      }
    }

    // Progress bar (if in progress and showStatus is true)
    if (this.options.showStatus && subtask.status === TaskStatus.IN_PROGRESS && subtask.progress !== undefined) {
      const progressStr = `[${this.generateProgressBar(subtask.progress, maxWidth - 12)} ${subtask.progress}%]`;
      lines.push('│ ' + progressStr.padEnd(maxWidth - 4) + ' │');
    }

    // Bottom border
    lines.push('└' + '─'.repeat(maxWidth - 2) + '┘');

    return lines;
  }

  /**
   * Get status symbol
   */
  private getStatusSymbol(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.COMPLETED:
        return '✓';
      case TaskStatus.FAILED:
        return '✗';
      case TaskStatus.IN_PROGRESS:
        return '◐';
      case TaskStatus.WAITING:
        return '○';
      default:
        return ' ';
    }
  }

  /**
   * Get status text
   */
  private getStatusText(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.COMPLETED:
        return 'done';
      case TaskStatus.FAILED:
        return 'fail';
      case TaskStatus.IN_PROGRESS:
        return 'busy';
      case TaskStatus.WAITING:
        return 'wait';
      default:
        return 'idle';
    }
  }

  /**
   * Generate progress bar
   */
  private generateProgressBar(progress: number, width: number): string {
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Truncate text with ellipsis
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Wrap text to fit width
   */
  private wrapText(text: string, width: number): string[] {
    const lines: string[] = [];
    for (let i = 0; i < text.length; i += width) {
      lines.push(text.substring(i, i + width));
    }
    return lines;
  }
}
