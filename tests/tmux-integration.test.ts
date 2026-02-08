/**
 * tmux Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  isTmuxAvailable,
  checkTerminalSize,
  validateTerminalSize,
  hasSession,
  listSessions,
  listOrchestratorSessions,
  MIN_TERMINAL_COLS,
  MIN_TERMINAL_ROWS
} from '../src/tui/tmux-integration.js';

describe('tmux Integration', () => {
  describe('Terminal Size Validation', () => {
    it('should return terminal dimensions', async () => {
      const size = await checkTerminalSize();
      expect(size).toHaveProperty('cols');
      expect(size).toHaveProperty('rows');
      expect(size.cols).toBeGreaterThan(0);
      expect(size.rows).toBeGreaterThan(0);
    });

    it('should validate terminal size against minimum requirements', async () => {
      const validation = await validateTerminalSize();
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('cols');
      expect(validation).toHaveProperty('rows');
    });

    it('should have defined minimum terminal dimensions', () => {
      expect(MIN_TERMINAL_COLS).toBe(80);
      expect(MIN_TERMINAL_ROWS).toBe(24);
    });
  });

  describe('tmux Availability', () => {
    it('should check if tmux is available', async () => {
      const available = await isTmuxAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('Session Management', () => {
    it('should check if a session exists', async () => {
      const exists = await hasSession('test-session-that-does-not-exist');
      expect(exists).toBe(false);
    });

    it('should list all tmux sessions', async () => {
      const sessions = await listSessions();
      expect(Array.isArray(sessions)).toBe(true);
    });

    it('should list orchestrator sessions only', async () => {
      const sessions = await listOrchestratorSessions();
      expect(Array.isArray(sessions)).toBe(true);
      sessions.forEach(session => {
        expect(session).toMatch(/^llm-orchestrator-/);
      });
    });
  });
});
