# TUI Tests

This directory contains tests for the Terminal User Interface (TUI) components.

## Test Files

### DAG Visualizer Tests

**File**: `tests/tui-dag-visualizer.test.mjs`
**Component**: `src/tui/dag-visualizer.ts`
**Framework**: Jest

Tests for the DAG (Directed Acyclic Graph) visualization component that renders task dependencies and status.

#### Test Coverage

- **Construction**
  - Create visualizer with default options
  - Create visualizer with custom options
  - Verify options are stored correctly

- **Visualization**
  - Visualize simple DAG structure
  - Generate non-empty output lines
  - Include status symbols when enabled
  - Exclude status symbols when disabled
  - Display progress bars for in-progress tasks
  - Handle empty subtasks array
  - Handle subtasks with no dependencies
  - Limit output to specified width

- **Dependency Handling**
  - Correctly identify task dependencies
  - Visualize dependency connections with vertical lines
  - Handle complex dependency graphs

- **Status Colors**
  - Use appropriate status colors for different task states
  - Display checkmarks for completed tasks
  - Display spinners for in-progress tasks
  - Display circles for waiting tasks

## Running Tests

### Run all TUI tests

```bash
npm run test:tui
```

### Run with coverage

```bash
npm run test:tui -- --coverage
```

### Run tests in watch mode

```bash
npm run test:tui -- --watch
```

## Test Structure

### Mock Data

Test files use mock data to ensure consistent, repeatable test results:

```javascript
const testSubtasks = [
  {
    id: 'task-1',
    description: 'First task',
    dependencies: [],
    status: 'completed',
    assignedTo: 'agent-1'
  },
  // ...
];
```

### Assertions

Tests use Jest assertions to verify:
- Component construction and options
- Output format and structure
- Status representation
- Dependency visualization
- Edge cases and error handling

## Testing Best Practices

### 1. Isolate Tests

Each test should be independent and not rely on the state of other tests.

### 2. Use Descriptive Names

Test names should clearly describe what is being tested:

```javascript
it('should visualize simple DAG', () => {
  // Test implementation
});
```

### 3. Test Edge Cases

Include tests for:
- Empty input arrays
- Single items
- Maximum limits
- Null/undefined values

### 4. Verify Output

Check that output is:
- Correctly formatted
- Within specified constraints (e.g., width)
- Contains expected elements

### 5. Use Mock Data

Use consistent mock data to ensure tests are:
- Repeatable
- Fast to execute
- Easy to understand

## Future Test Additions

### Planned Test Coverage

- **SystemMonitor Component**
  - CPU usage display
  - Memory usage display
  - GPU monitoring
  - Resource update intervals

- **Dashboard Component**
  - Keyboard shortcut handling
  - Filter functionality
  - State management
  - Component interaction

- **AgentPanel Component**
  - Task display by agent
  - Status updates
  - Progress tracking

- **HelpMenu Component**
  - Keyboard shortcuts display
  - Modal behavior
  - Navigation

- **LogStream Component**
  - Log entry display
  - Scrolling functionality
  - Timestamp formatting

## Troubleshooting

### Build Errors

If you encounter build errors:

1. **Module not found errors**:
   - Check import paths
   - Ensure source files exist
   - Verify TypeScript compilation

2. **Type errors**:
   - Check type definitions
   - Ensure proper imports
   - Verify TypeScript version compatibility

### Test Execution Errors

1. **Module resolution errors**:
   - Verify Jest configuration
   - Check tsconfig.json settings
   - Ensure dependencies are installed

2. **Timeout errors**:
   - Increase test timeout in jest.config.js
   - Check for infinite loops
   - Review async operations

## Coverage Goals

Target coverage:
- Lines: 80%
- Branches: 75%
- Functions: 80%
- Statements: 80%

View coverage report:
```bash
npm run test:tui -- --coverage
```
