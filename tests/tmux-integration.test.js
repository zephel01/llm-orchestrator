/**
 * tmux Integration Tests
 */
import { describe, it, expect } from '@jest/globals';
describe('tmux Integration (Integration Tests)', () => {
    describe('Terminal Size Validation', () => {
        it('should have defined minimum terminal dimensions', async () => {
            const { isTmuxAvailable } = await import('../src/tui/tmux-integration.js');
            expect(isTmuxAvailable).toBeDefined();
            // Test constants if available
            const module = await import('../src/tui/tmux-integration.js');
            if ('MIN_TERMINAL_COLS' in module) {
                expect(module.MIN_TERMINAL_COLS).toBe(80);
                expect(module.MIN_TERMINAL_ROWS).toBe(24);
            }
        });
        it('should check if tmux is available', async () => {
            const { isTmuxAvailable } = await import('../src/tui/tmux-integration.js');
            const available = await isTmuxAvailable();
            expect(typeof available).toBe('boolean');
        });
        it('should return terminal dimensions', async () => {
            const { checkTerminalSize } = await import('../src/tui/tmux-integration.js');
            const size = await checkTerminalSize();
            expect(size).toHaveProperty('cols');
            expect(size).toHaveProperty('rows');
            expect(size.cols).toBeGreaterThan(0);
            expect(size.rows).toBeGreaterThan(0);
        });
        it('should validate terminal size against minimum requirements', async () => {
            const { validateTerminalSize } = await import('../src/tui/tmux-integration.js');
            const validation = await validateTerminalSize();
            expect(validation).toHaveProperty('valid');
            expect(validation).toHaveProperty('cols');
            expect(validation).toHaveProperty('rows');
        });
    });
    describe('Session Management', () => {
        it('should check if a session exists', async () => {
            const { hasSession } = await import('../src/tui/tmux-integration.js');
            const exists = await hasSession('test-session-that-does-not-exist');
            expect(exists).toBe(false);
        });
        it('should list all tmux sessions', async () => {
            const { listSessions } = await import('../src/tui/tmux-integration.js');
            const sessions = await listSessions();
            expect(Array.isArray(sessions)).toBe(true);
        });
        it('should list orchestrator sessions only', async () => {
            const { listOrchestratorSessions } = await import('../src/tui/tmux-integration.js');
            const sessions = await listOrchestratorSessions();
            expect(Array.isArray(sessions)).toBe(true);
            sessions.forEach(session => {
                expect(session).toMatch(/^llm-orchestrator-/);
            });
        });
    });
});
//# sourceMappingURL=tmux-integration.test.js.map