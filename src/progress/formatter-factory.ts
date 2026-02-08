/**
 * Progress Formatters
 * Creates appropriate formatter based on format type
 */

import { ProgressFormat, ProgressFormatter } from './types.js';
import { InlineFormatter } from './inline-formatter.js';
import { ProgressBarFormatter } from './progress-bar-formatter.js';
import { JsonFormatter } from './json-formatter.js';

export class ProgressFormatterFactory {
  static create(format: ProgressFormat): ProgressFormatter {
    switch (format) {
      case 'inline':
        return new InlineFormatter();
      case 'progress':
        return new ProgressBarFormatter();
      case 'json':
        return new JsonFormatter();
      default:
        return new InlineFormatter();
    }
  }
}
