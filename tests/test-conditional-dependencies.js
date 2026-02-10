#!/usr/bin/env node
/**
 * Test Conditional Dependencies
 */
import { TaskStatus } from '../src/dependencies/types.js';
import { normalizeDependency, evaluateCondition, areDependenciesReady, isDependencyBlocking, getDependencyBlockageReason } from '../src/dependencies/condition-evaluator.js';
console.log('Testing Conditional Dependencies...\n');
// Test 1: Normalize string dependency
console.log('Test 1: Normalize string dependency');
const dep1 = normalizeDependency('task-a');
console.log('  Input: "task-a"');
console.log('  Output:', JSON.stringify(dep1));
console.log('  Expected: { taskId: "task-a", condition: "success" }');
console.log('  Pass:', dep1.taskId === 'task-a' && dep1.condition === 'success');
console.log();
// Test 2: Normalize conditional dependency
console.log('Test 2: Normalize conditional dependency');
const dep2 = normalizeDependency({ taskId: 'task-b', condition: 'failure' });
console.log('  Input: { taskId: "task-b", condition: "failure" }');
console.log('  Output:', JSON.stringify(dep2));
console.log('  Expected: { taskId: "task-b", condition: "failure" }');
console.log('  Pass:', dep2.taskId === 'task-b' && dep2.condition === 'failure');
console.log();
// Test 3: Evaluate success condition
console.log('Test 3: Evaluate success condition');
const dep3 = { taskId: 'task-a', condition: 'success' };
const result3a = evaluateCondition(dep3, TaskStatus.COMPLETED);
const result3b = evaluateCondition(dep3, TaskStatus.FAILED);
console.log('  Dependency:', JSON.stringify(dep3));
console.log('  Status COMPLETED:', result3a, '(expected: true)');
console.log('  Status FAILED:', result3b, '(expected: false)');
console.log('  Pass:', result3a === true && result3b === false);
console.log();
// Test 4: Evaluate failure condition
console.log('Test 4: Evaluate failure condition');
const dep4 = { taskId: 'task-a', condition: 'failure' };
const result4a = evaluateCondition(dep4, TaskStatus.FAILED);
const result4b = evaluateCondition(dep4, TaskStatus.COMPLETED);
console.log('  Dependency:', JSON.stringify(dep4));
console.log('  Status FAILED:', result4a, '(expected: true)');
console.log('  Status COMPLETED:', result4b, '(expected: false)');
console.log('  Pass:', result4a === true && result4b === false);
console.log();
// Test 5: Evaluate any condition
console.log('Test 5: Evaluate any condition');
const dep5 = { taskId: 'task-a', condition: 'any' };
const result5a = evaluateCondition(dep5, TaskStatus.COMPLETED);
const result5b = evaluateCondition(dep5, TaskStatus.FAILED);
const result5c = evaluateCondition(dep5, TaskStatus.SKIPPED);
const result5d = evaluateCondition(dep5, TaskStatus.IN_PROGRESS);
console.log('  Dependency:', JSON.stringify(dep5));
console.log('  Status COMPLETED:', result5a, '(expected: true)');
console.log('  Status FAILED:', result5b, '(expected: true)');
console.log('  Status SKIPPED:', result5c, '(expected: true)');
console.log('  Status IN_PROGRESS:', result5d, '(expected: false)');
console.log('  Pass:', result5a && result5b && result5c && !result5d);
console.log();
// Test 6: Evaluate output-based condition
console.log('Test 6: Evaluate output-based condition');
const dep6 = {
    taskId: 'task-a',
    condition: (result) => result.score > 0.8
};
const result6a = evaluateCondition(dep6, TaskStatus.COMPLETED, { score: 0.9 });
const result6b = evaluateCondition(dep6, TaskStatus.COMPLETED, { score: 0.5 });
console.log('  Dependency: condition => result.score > 0.8');
console.log('  Output { score: 0.9 }:', result6a, '(expected: true)');
console.log('  Output { score: 0.5 }:', result6b, '(expected: false)');
console.log('  Pass:', result6a === true && result6b === false);
console.log();
// Test 7: Check if dependencies are ready
console.log('Test 7: Check if dependencies are ready');
const deps7 = ['task-a', 'task-b'];
const mockDeps7 = (taskId) => {
    const status = taskId === 'task-a' ? TaskStatus.COMPLETED : TaskStatus.PENDING;
    return { status };
};
const result7 = areDependenciesReady(deps7, mockDeps7);
console.log('  Dependencies: ["task-a", "task-b"]');
console.log('  task-a: COMPLETED, task-b: PENDING');
console.log('  Result:', result7, '(expected: false)');
console.log('  Pass:', result7 === false);
console.log();
// Test 8: Check if dependencies are ready (all completed)
console.log('Test 8: Check if dependencies are ready (all completed)');
const deps8 = ['task-a', 'task-b'];
const mockDeps8 = () => ({ status: TaskStatus.COMPLETED });
const result8 = areDependenciesReady(deps8, mockDeps8);
console.log('  Dependencies: ["task-a", "task-b"]');
console.log('  Both: COMPLETED');
console.log('  Result:', result8, '(expected: true)');
console.log('  Pass:', result8 === true);
console.log();
// Test 9: Check if dependencies are ready with failure condition
console.log('Test 9: Check if dependencies are ready with failure condition');
const deps9 = [{ taskId: 'task-a', condition: 'failure' }];
const mockDeps9 = () => ({ status: TaskStatus.FAILED });
const result9 = areDependenciesReady(deps9, mockDeps9);
console.log('  Dependencies: [{ taskId: "task-a", condition: "failure" }]');
console.log('  task-a: FAILED');
console.log('  Result:', result9, '(expected: true)');
console.log('  Pass:', result9 === true);
console.log();
// Test 10: Check blocking dependency
console.log('Test 10: Check blocking dependency');
const dep10 = { taskId: 'task-a', condition: 'success' };
const result10a = isDependencyBlocking(dep10, TaskStatus.IN_PROGRESS);
const result10b = isDependencyBlocking(dep10, TaskStatus.COMPLETED);
const result10c = isDependencyBlocking(dep10, TaskStatus.FAILED);
console.log('  Dependency:', JSON.stringify(dep10));
console.log('  Status IN_PROGRESS:', result10a, '(expected: true)');
console.log('  Status COMPLETED:', result10b, '(expected: false)');
console.log('  Status FAILED:', result10c, '(expected: true - condition not met)');
console.log('  Pass:', result10a && !result10b && result10c);
console.log();
// Test 11: Get blockage reason
console.log('Test 11: Get blockage reason');
const deps11 = ['task-a', { taskId: 'task-b', condition: 'failure' }];
const mockDeps11 = (taskId) => {
    if (taskId === 'task-a')
        return { status: TaskStatus.COMPLETED };
    return { status: TaskStatus.COMPLETED }; // task-b completed but condition expects failure
};
const reason11 = getDependencyBlockageReason(deps11, mockDeps11);
console.log('  Dependencies: ["task-a", { taskId: "task-b", condition: "failure" }]');
console.log('  task-a: COMPLETED, task-b: COMPLETED');
console.log('  Reason:', reason11);
console.log('  Pass:', reason11 !== null && reason11.includes('task-b'));
console.log();
console.log('All tests completed!\n');
//# sourceMappingURL=test-conditional-dependencies.js.map