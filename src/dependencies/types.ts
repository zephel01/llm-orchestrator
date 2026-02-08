/**
 * Types for dependency management system
 */

/**
 * Task status
 */
export enum TaskStatus {
  PENDING = 'pending',       // タスクが作成されたが開始されていない
  WAITING = 'waiting',       // 依存関係を待機中
  READY = 'ready',           // 実行可能
  IN_PROGRESS = 'in_progress', // 実行中
  COMPLETED = 'completed',   // 完了
  FAILED = 'failed',         // 失敗
  SKIPPED = 'skipped'        // スキップ
}

/**
 * Subtask with dependencies
 */
export interface SubtaskWithDependencies {
  id: string;
  description: string;
  dependencies: string[];  // 依存するサブタスク ID 配列
  status: TaskStatus;
  assignedTo?: string;     // 割り当てられたエージェント ID
  createdAt?: number;
  startedAt?: number;
  completedAt?: number;
  result?: any;            // タスクの結果（次のタスクで使用可能）
}

/**
 * Node in dependency graph
 */
export interface DependencyNode {
  subtask: SubtaskWithDependencies;
  dependents: string[];     // このタスクに依存するタスク ID 配列
  indegree: number;        // 入次数（このタスクが依存するタスク数）
}

/**
 * Execution order result
 */
export interface ExecutionOrder {
  order: string[];         // 実行順序のサブタスク ID 配列
  parallelLevels: string[][];  // 並列実行可能なレベル
}

/**
 * Cycle detection result
 */
export interface CycleResult {
  hasCycle: boolean;
  cycle?: string[];        // サイクルを構成するノード配列
}

/**
 * Subtask status information
 */
export interface SubtaskStatus {
  id: string;
  description: string;
  status: TaskStatus;
  dependencies: string[];
  assignedTo?: string;
  progress?: number;       // 進捗率（0-100）
}
