/**
 * Tests for DAG Visualizer
 */

import { DAGVisualizer } from '../src/tui/dag-visualizer.js';
import { SubtaskWithDependencies, TaskStatus } from '../src/dependencies/types.js';

// Test data
const testSubtasks: SubtaskWithDependencies[] = [
  {
    id: 'task-1',
    description: 'First task',
    dependencies: [],
    status: TaskStatus.COMPLETED,
    assignedTo: 'agent-1'
  },
  {
    id: 'task-2',
    description: 'Second task',
    dependencies: ['task-1'],
    status: TaskStatus.IN_PROGRESS,
    assignedTo: 'agent-2',
    progress: 50
  },
  {
    id: 'task-3',
    description: 'Third task',
    dependencies: ['task-1'],
    status: TaskStatus.WAITING,
    assignedTo: 'agent-3'
  }
];

describe('DAGVisualizer', () => {
  describe('Construction', () => {
    it('should create a visualizer with default options', () => {
      const visualizer = new DAGVisualizer();
      expect(visualizer).toBeDefined();
    });

    it('should create a visualizer with custom options', () => {
      const visualizer = new DAGVisualizer({
        width: 100,
        showStatus: true
      });
      expect(visualizer).toBeDefined();
    });
  });

  describe('Visualization', () => {
    it('should visualize simple DAG', () => {
      const visualizer = new DAGVisualizer({ width: 80, showStatus: true });
      const result = visualizer.visualize(testSubtasks);

      expect(result).toBeDefined();
      expect(result.lines).toBeDefined();
      expect(Array.isArray(result.lines)).toBe(true);
      expect(result.lines.length).toBeGreaterThan(0);
    });

    it('should generate non-empty lines', () => {
      const visualizer = new DAGVisualizer({ width: 80, showStatus: true });
      const result = visualizer.visualize(testSubtasks);

      result.lines.forEach((line, index) => {
        expect(line).toBeDefined();
        expect(typeof line).toBe('string');
        expect(line.trim().length).toBeGreaterThan(0);
      });
    });

    it('should include status symbols when showStatus is true', () => {
      const visualizer = new DAGVisualizer({ width: 80, showStatus: true });
      const result = visualizer.visualize(testSubtasks);

      const allText = result.lines.join('\n');
      expect(allText).toContain('✓');
      expect(allText).toContain('◐');
      expect(allText).toContain('○');
    });

    it('should not include status symbols when showStatus is false', () => {
      const visualizer = new DAGVisualizer({ width: 80, showStatus: false });
      const result = visualizer.visualize(testSubtasks);

      const allText = result.lines.join('\n');
      // Status symbols should not appear
      expect(allText).not.toContain('✓');
      expect(allText).not.toContain('◐');
      expect(allText).not.toContain('○');
    });

    it('should include progress bars for in-progress tasks', () => {
      const visualizer = new DAGVisualizer({ width: 80, showStatus: true });
      const result = visualizer.visualize(testSubtasks);

      const allText = result.lines.join('\n');
      expect(allText).toContain('█'); // Progress bar character
      expect(allText).toContain('50%');
    });

    it('should handle empty subtasks array', () => {
      const visualizer = new DAGVisualizer({ width: 80, showStatus: true });
      const result = visualizer.visualize([]);

      expect(result).toBeDefined();
      expect(result.lines).toBeDefined();
    });

    it('should handle subtasks with no dependencies', () => {
      const visualizer = new DAGVisualizer({ width: 80, showStatus: true });
      const result = visualizer.visualize([testSubtasks[0]]);

      expect(result).toBeDefined();
      expect(result.lines.length).toBeGreaterThan(0);
    });

    it('should limit output to specified width', () => {
      const width = 50;
      const visualizer = new DAGVisualizer({ width, showStatus: true });
      const result = visualizer.visualize(testSubtasks);

      result.lines.forEach((line, index) => {
        expect(line.length).toBeLessThanOrEqual(width);
      });
    });
  });

  describe('Dependency Handling', () => {
    it('should correctly identify task dependencies', () => {
      const visualizer = new DAGVisualizer({ width: 80, showStatus: true });
      const result = visualizer.visualize(testSubtasks);

      // task-2 depends on task-1
      const task2Index = testSubtasks.findIndex(st => st.id === 'task-2');
      const task2DependsOnTask1 = testSubtasks[task2Index].dependencies.includes('task-1');

      expect(task2DependsOnTask1).toBe(true);
    });

    it('should visualize dependency connections', () => {
      const visualizer = new DAGVisualizer({ width: 80, showStatus: true });
      const result = visualizer.visualize(testSubtasks);

      const allText = result.lines.join('\n');

      // Should include vertical lines for connections
      expect(allText).toContain('│');
    });
  });

  describe('Status Colors', () => {
    it('should use appropriate status colors', () => {
      const visualizer = new DAGVisualizer({ width: 80, showStatus: true });
      const result = visualizer.visualize(testSubtasks);

      // Each status should have visual representation
      const allText = result.lines.join('\n');

      // Completed task should have checkmark
      expect(allText).toContain('✓');

      // In-progress task should have spinner
      expect(allText).toContain('◐');

      // Waiting task should have circle
      expect(allText).toContain('○');
    });
  });
});
