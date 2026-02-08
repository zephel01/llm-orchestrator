// Agent Manager - アクティブなエージェントを管理

import { TeammateAgent, TeammateAgentConfig } from './teammate.js';
import { StorageBackend, Message } from '../communication/index.js';

export interface AgentInfo {
  id: string;
  type: 'lead' | 'teammate';
  status: 'idle' | 'busy' | 'waiting_approval' | 'stopped';
  task?: string;
  assignedBy?: string;
  createdAt: number;
  lastActivity: number;
}

export interface Subtask {
  id: string;
  task: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  assignedAt?: number;
  completedAt?: number;
}

export class AgentManager {
  private activeAgents: Map<string, TeammateAgent> = new Map();
  private agentInfo: Map<string, AgentInfo> = new Map();
  private subtasks: Map<string, Subtask> = new Map();
  private teamName: string;
  private backend: StorageBackend;
  private agentCounter: number = 0;

  constructor(teamName: string, backend: StorageBackend) {
    this.teamName = teamName;
    this.backend = backend;
  }

  /**
   * 新しい Teammate エージェントを生成（spawn）
   */
  async spawnTeammate(config: {
    provider: {
      type: 'anthropic' | 'openai' | 'ollama';
      model?: string;
    };
    workingDir?: string;
  }): Promise<AgentInfo> {
    const agentId = `teammate-${++this.agentCounter}`;

    const agentConfig: TeammateAgentConfig = {
      agentId,
      teamName: this.teamName,
      provider: config.provider,
      workingDir: config.workingDir,
      backend: this.backend,
    };

    const agent = new TeammateAgent(agentConfig);
    await agent.start();

    this.activeAgents.set(agentId, agent);

    const agentInfo: AgentInfo = {
      id: agentId,
      type: 'teammate',
      status: 'idle',
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.agentInfo.set(agentId, agentInfo);

    console.log(`[AgentManager] Spawned new teammate: ${agentId}`);
    return agentInfo;
  }

  /**
   * エージェントにサブタスクを割り当て
   */
  async assignSubtask(subtaskId: string, task: string, agentId?: string): Promise<void> {
    // エージェントが指定されていない場合は、空いているエージェントを検索
    if (!agentId) {
      agentId = this.findIdleAgent();
      if (!agentId) {
        throw new Error('No available agents to assign subtask');
      }
    }

    const agent = this.activeAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // サブタスク情報を作成
    const subtask: Subtask = {
      id: subtaskId,
      task,
      assignedTo: agentId,
      status: 'in_progress',
      assignedAt: Date.now(),
    };

    this.subtasks.set(subtaskId, subtask);

    // エージェント情報を更新
    const agentInfo = this.agentInfo.get(agentId);
    if (agentInfo) {
      agentInfo.status = 'busy';
      agentInfo.task = task;
      agentInfo.assignedBy = 'lead';
      agentInfo.lastActivity = Date.now();
    }

    // エージェントにコマンドを送信
    const command: Message = {
      id: this.generateId(),
      from: 'lead',
      to: agentId,
      type: 'command',
      content: { task },
      timestamp: Date.now(),
      status: 'delivered',
    };

    await this.backend.writeMessage(agentId, command);

    console.log(`[AgentManager] Assigned subtask ${subtaskId} to agent ${agentId}`);
  }

  /**
   * エージェントを停止
   */
  async stopAgent(agentId: string): Promise<void> {
    const agent = this.activeAgents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // 停止コマンドを送信
    const stopCommand: Message = {
      id: this.generateId(),
      from: 'lead',
      to: agentId,
      type: 'stop',
      content: { reason: 'Stop requested by lead' },
      timestamp: Date.now(),
      status: 'delivered',
    };

    await this.backend.writeMessage(agentId, stopCommand);
    await agent.stop();

    // マネージャーから削除
    this.activeAgents.delete(agentId);
    this.agentInfo.delete(agentId);

    // 進行中のサブタスクを失敗としてマーク
    for (const [subtaskId, subtask] of this.subtasks) {
      if (subtask.assignedTo === agentId && subtask.status === 'in_progress') {
        subtask.status = 'failed';
        this.subtasks.set(subtaskId, subtask);
      }
    }

    console.log(`[AgentManager] Stopped agent: ${agentId}`);
  }

  /**
   * 全てのエージェントを停止
   */
  async stopAllAgents(): Promise<void> {
    const agentIds = Array.from(this.activeAgents.keys());

    for (const agentId of agentIds) {
      await this.stopAgent(agentId);
    }

    console.log(`[AgentManager] Stopped all agents`);
  }

  /**
   * アクティブなエージェントの一覧を取得
   */
  getActiveAgents(): AgentInfo[] {
    return Array.from(this.agentInfo.values());
  }

  /**
   * 空いているエージェントを検索
   */
  findIdleAgent(): string | undefined {
    for (const [agentId, agentInfo] of this.agentInfo) {
      if (agentInfo.status === 'idle') {
        return agentId;
      }
    }
    return undefined;
  }

  /**
   * エージェント情報を更新
   */
  updateAgentStatus(agentId: string, status: 'idle' | 'busy' | 'waiting_approval' | 'stopped'): void {
    const agentInfo = this.agentInfo.get(agentId);
    if (agentInfo) {
      agentInfo.status = status;
      agentInfo.lastActivity = Date.now();
    }
  }

  /**
   * サブタスクの結果を記録
   */
  recordSubtaskResult(subtaskId: string, result: any): void {
    const subtask = this.subtasks.get(subtaskId);
    if (subtask) {
      subtask.status = 'completed';
      subtask.result = result;
      subtask.completedAt = Date.now();
      this.subtasks.set(subtaskId, subtask);

      // エージェントのステータスを更新
      if (subtask.assignedTo) {
        const agentInfo = this.agentInfo.get(subtask.assignedTo);
        if (agentInfo) {
          agentInfo.status = 'idle';
          agentInfo.task = undefined;
        }
      }

      console.log(`[AgentManager] Subtask ${subtaskId} completed`);
    }
  }

  /**
   * サブタスクの一覧を取得
   */
  getSubtasks(): Subtask[] {
    return Array.from(this.subtasks.values());
  }

  /**
   * サブタスクを取得
   */
  getSubtask(subtaskId: string): Subtask | undefined {
    return this.subtasks.get(subtaskId);
  }

  /**
   * 進行中のサブタスクの数を取得
   */
  getInProgressCount(): number {
    return Array.from(this.subtasks.values()).filter(s => s.status === 'in_progress').length;
  }

  /**
   * 全てのサブタスクが完了したかチェック
   */
  areAllSubtasksCompleted(): boolean {
    const subtasks = Array.from(this.subtasks.values());
    return subtasks.length > 0 && subtasks.every(s => s.status === 'completed' || s.status === 'failed');
  }

  /**
   * サブタスクをクリア
   */
  clearSubtasks(): void {
    this.subtasks.clear();
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    return {
      activeAgents: this.activeAgents.size,
      totalAgentsCreated: this.agentCounter,
      subtasks: {
        total: this.subtasks.size,
        inProgress: this.getInProgressCount(),
        completed: Array.from(this.subtasks.values()).filter(s => s.status === 'completed').length,
        failed: Array.from(this.subtasks.values()).filter(s => s.status === 'failed').length,
      },
    };
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
