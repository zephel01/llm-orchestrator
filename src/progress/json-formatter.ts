/**
 * JSON Formatter
 * Formats progress as JSON for machine-readable output
 */

import { ProgressState, ProgressFormatter } from './types.js';

export class JsonFormatter implements ProgressFormatter {
  format(state: ProgressState): string {
    return JSON.stringify(state, null, 2);
  }
}
