/**
 * DAG Visualization Component for TUI Dashboard
 */

import React from 'react';
import { Box, Text } from 'ink';
import { DAGVisualizer } from './dag-visualizer.js';
import { SubtaskWithDependencies } from '../dependencies/types.js';

interface DAGViewProps {
  subtasks: SubtaskWithDependencies[];
  width?: number;
}

export const DAGView: React.FC<DAGViewProps> = ({
  subtasks,
  width = 80
}) => {
  const visualizer = new DAGVisualizer({ width, showStatus: true });
  const dag = visualizer.visualize(subtasks);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {dag.lines.map((line, index) => (
        <Text key={`dag-line-${index}`}>{line}</Text>
      ))}
    </Box>
  );
};
