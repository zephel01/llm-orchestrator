/**
 * System Resources Monitor
 * CPU, GPU, Memory usage monitoring for TUI Dashboard
 */

import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import si from 'systeminformation';

// System Resources Data
interface SystemResources {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  gpu?: {
    model: string;
    usage: number;
    memory?: {
      total: number;
      used: number;
      percentage: number;
    };
  };
}

// Format bytes to readable format
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Generate usage bar
function generateUsageBar(usage: number, width: number = 15): string {
  const filled = Math.round((usage / 100) * width);
  const empty = width - filled;
  let bar = '█'.repeat(filled) + '░'.repeat(empty);

  // Color coding
  if (usage >= 90) {
    bar = '\x1b[31m' + bar + '\x1b[0m'; // Red
  } else if (usage >= 70) {
    bar = '\x1b[33m' + bar + '\x1b[0m'; // Yellow
  } else {
    bar = '\x1b[32m' + bar + '\x1b[0m'; // Green
  }

  return bar;
}

// System Resources Monitor Component
interface SystemMonitorProps {
  debug?: boolean;
}

export const SystemMonitor: React.FC<SystemMonitorProps> = ({ debug = false }) => {
  const [resources, setResources] = useState<SystemResources>({
    cpu: { usage: 0, cores: 0 },
    memory: { total: 0, used: 0, free: 0, percentage: 0 },
    gpu: undefined
  });

  // Update system resources every 2 seconds
  useEffect(() => {
    const updateResources = async () => {
      try {
        const [cpu, memory, graphics] = await Promise.all([
          si.currentLoad(),
          si.mem(),
          si.graphics()
        ]);

        const gpuData = graphics.controllers.length > 0 ? {
          model: graphics.controllers[0].model || 'Unknown',
          usage: ((graphics.controllers[0] as any).usageGpu || 0) as number,
          memory: (graphics.controllers[0] as any).vram ? {
            total: ((graphics.controllers[0] as any).vram || 0) as number,
            used: ((graphics.controllers[0] as any).vramUtilization || 0) as number,
            percentage: Math.round(
              (((graphics.controllers[0] as any).vramUtilization || 0) / ((graphics.controllers[0] as any).vram || 1)) * 100
            )
          } : undefined
        } : undefined;

        setResources({
          cpu: {
            usage: Math.round(cpu.currentLoad),
            cores: cpu.cpus?.length || 0
          },
          memory: {
            total: memory.total,
            used: memory.used,
            free: memory.free,
            percentage: Math.round((memory.used / memory.total) * 100)
          },
          gpu: gpuData
        });
      } catch (error) {
        if (debug) {
          console.error('[SystemMonitor] Error fetching system resources:', error);
        }
      }
    };

    // Initial fetch
    updateResources();

    // Update every 2 seconds
    const interval = setInterval(updateResources, 2000);

    return () => clearInterval(interval);
  }, [debug]);

  return (
    <Box
      flexDirection="column"
      borderColor="cyan"
      paddingX={1}
      flexGrow={1}
    >
      <Text bold color="cyan">System Resources</Text>
      <Box marginTop={1}>
        {/* CPU */}
        <Box flexDirection="column" marginBottom={1}>
          <Text>
            <Text color="magenta">CPU:</Text> {resources.cpu.usage}%
          </Text>
          <Box marginLeft={1}>
            <Text>{generateUsageBar(resources.cpu.usage, 15)}</Text>
          </Box>
          <Text dimColor>
            {' '}{resources.cpu.cores} cores
          </Text>
        </Box>

        {/* Memory */}
        <Box flexDirection="column" marginBottom={1}>
          <Text>
            <Text color="blue">Memory:</Text> {resources.memory.percentage}%
          </Text>
          <Box marginLeft={1}>
            <Text>{generateUsageBar(resources.memory.percentage, 15)}</Text>
          </Box>
          <Text dimColor>
            {' '}{formatBytes(resources.memory.used)} / {formatBytes(resources.memory.total)}
          </Text>
        </Box>

        {/* GPU (if available) */}
        {resources.gpu && (
          <Box flexDirection="column" marginBottom={1}>
            <Text>
              <Text color="green">GPU:</Text> {resources.gpu.model.substring(0, 15)}
            </Text>
            <Box marginLeft={1}>
              <Text>{generateUsageBar(resources.gpu.usage, 15)}</Text>
            </Box>
            <Text dimColor>
              {' '}{resources.gpu.usage}%
            </Text>
            {resources.gpu.memory && (
              <Text dimColor>
                {' | VRAM: '}{formatBytes(resources.gpu.memory.used)} / {formatBytes(resources.gpu.memory.total)}
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};
