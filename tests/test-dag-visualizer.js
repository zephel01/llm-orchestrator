/**
 * Test DAG Visualizer
 */
import { DAGVisualizer } from '../src/tui/dag-visualizer.js';
import { TaskStatus } from '../src/dependencies/types.js';
// Mock data
const mockSubtasks = [
    {
        id: 'task-1',
        description: 'Design database schema',
        dependencies: [],
        status: TaskStatus.COMPLETED,
        assignedTo: 'agent-1'
    },
    {
        id: 'task-2',
        description: 'Create API endpoints',
        dependencies: ['task-1'],
        status: TaskStatus.IN_PROGRESS,
        assignedTo: 'agent-2',
        progress: 45
    },
    {
        id: 'task-3',
        description: 'Implement authentication',
        dependencies: ['task-1'],
        status: TaskStatus.WAITING,
        assignedTo: 'agent-3'
    },
    {
        id: 'task-4',
        description: 'Write unit tests',
        dependencies: ['task-2', 'task-3'],
        status: TaskStatus.PENDING,
        assignedTo: 'agent-1'
    },
    {
        id: 'task-5',
        description: 'Deploy to production',
        dependencies: ['task-4'],
        status: TaskStatus.PENDING,
        assignedTo: 'agent-2'
    }
];
// Mock data with conditional dependencies
const mockConditionalSubtasks = [
    {
        id: 'deploy',
        description: 'Deploy to production',
        dependencies: ['build'],
        status: TaskStatus.PENDING,
        assignedTo: 'agent-1'
    },
    {
        id: 'build',
        description: 'Build project',
        dependencies: ['test'],
        status: TaskStatus.COMPLETED,
        assignedTo: 'agent-2'
    },
    {
        id: 'test',
        description: 'Run tests',
        dependencies: ['test-unit', 'test-integration'],
        status: TaskStatus.COMPLETED,
        assignedTo: 'agent-3'
    },
    {
        id: 'test-unit',
        description: 'Run unit tests',
        dependencies: [],
        status: TaskStatus.COMPLETED,
        assignedTo: 'agent-1'
    },
    {
        id: 'test-integration',
        description: 'Run integration tests',
        dependencies: [],
        status: TaskStatus.COMPLETED,
        assignedTo: 'agent-2'
    },
    {
        id: 'rollback',
        description: 'Rollback on failure',
        dependencies: [
            { taskId: 'deploy', condition: 'failure' }
        ],
        status: TaskStatus.PENDING,
        assignedTo: 'agent-3'
    }
];
console.log('Testing DAG Visualizer\n');
console.log('='.repeat(80) + '\n');
// Test 1: Simple DAG
console.log('Test 1: Simple DAG\n');
const visualizer1 = new DAGVisualizer({ width: 80, showStatus: true });
const dag1 = visualizer1.visualize(mockSubtasks);
console.log(dag1.lines.join('\n'));
console.log('\n' + '='.repeat(80) + '\n');
// Test 2: Conditional dependencies
console.log('Test 2: DAG with Conditional Dependencies\n');
const visualizer2 = new DAGVisualizer({ width: 80, showStatus: true });
const dag2 = visualizer2.visualize(mockConditionalSubtasks);
console.log(dag2.lines.join('\n'));
console.log('\n' + '='.repeat(80) + '\n');
console.log('Tests completed!\n');
//# sourceMappingURL=test-dag-visualizer.js.map