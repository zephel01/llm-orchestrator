/**
 * Inline Formatter
 * Formats progress as inline console output with status icons
 */

import { ProgressState, ProgressFormatter } from './types.js';

export class InlineFormatter implements ProgressFormatter {
  format(state: ProgressState): string {
    const lines: string[] = [];

    // Progress bar
    const bar = this.createProgressBar(state.progressPercentage, 20);
    lines.push(`[${bar}] ${state.progressPercentage}% (${state.completedSubtasks}/${state.totalSubtasks})`);

    // Summary line
    lines.push(`Active Agents: ${state.activeAgents}`);

    // Subtasks
    if (state.subtasks.length > 0) {
      lines.push('\nSubtasks:');
      for (const subtask of state.subtasks) {
        lines.push(`  ${this.getStatusIcon(subtask.status)} ${subtask.description} ${this.getStatusText(subtask.status)}`);
        if (subtask.error) {
          lines.push(`    ⚠️  Error: ${subtask.error}`);
        }
      }
    }

    return lines.join('\n');
  }

  private createProgressBar(percentage: number, width: number): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '='.repeat(filled) + ' '.repeat(empty);
  }

  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: '⏸️',
      waiting: '⏳',
      ready: '✅',
      in_progress: '🔄',
      completed: '✅',
      failed: '❌',
      skipped: '⏭️'
    };
    return icons[status] || '❓';
  }

  private getStatusText(status: string): string {
    const texts: Record<string, string> = {
      pending: '(pending)',
      waiting: '(waiting)',
      ready: '(ready)',
      in_progress: '(in progress)',
      completed: '(completed)',
      failed: '(failed)',
      skipped: '(skipped)'
    };
    return texts[status] || '';
  }
}
