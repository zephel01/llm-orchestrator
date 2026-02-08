/**
 * Progress Bar Formatter
 * Formats progress as a simple progress bar with summary
 */

import { ProgressState, ProgressFormatter } from './types.js';

export class ProgressBarFormatter implements ProgressFormatter {
  format(state: ProgressState): string {
    const lines: string[] = [];

    // Progress bar
    const bar = this.createProgressBar(state.progressPercentage, 40);
    lines.push(`Progress: [${bar}] ${state.progressPercentage}%`);

    // Summary line
    const summary = `Total: ${state.totalSubtasks} | Done: ${state.completedSubtasks} | ` +
                   `Active: ${state.inProgressSubtasks} | Waiting: ${state.waitingSubtasks}`;
    lines.push(summary);

    // Failed tasks
    if (state.failedSubtasks > 0) {
      lines.push(`\n⚠️  ${state.failedSubtasks} task(s) failed`);
    }

    return lines.join('\n');
  }

  private createProgressBar(percentage: number, width: number): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}
