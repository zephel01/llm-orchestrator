// Teammate Agent - サブタスクを担当するエージェント

import { AgentKernel } from '../agent-kernel/index.js';
import { StorageBackend, Message } from '../communication/index.js';
import { createProvider } from '../providers/index.js';
import * as path from 'path';

export interface TeammateAgentConfig {
  agentId: string;
  teamName: string;
  provider: {
    type: 'anthropic' | 'openai' | 'ollama';
    model?: string;
  };
  workingDir?: string;
  backend?: StorageBackend;
}

export class TeammateAgent {
  private kernel: AgentKernel;
  private commBus: StorageBackend;
  private agentId: string;
  private teamName: string;
  private workingDir: string;
  private isRunning: boolean = false;
  private currentTask: string = '';
  private assignedBy: string = '';

  constructor(config: TeammateAgentConfig) {
    this.agentId = config.agentId;
    this.teamName = config.teamName;
    this.workingDir = config.workingDir || process.cwd();

    // プロバイダー作成
    const provider = createProvider({
      type: config.provider.type,
      model: config.provider.model,
    });

    // Kernel 初期化
    this.kernel = new AgentKernel({
      agentId: config.agentId,
      provider,
      systemPrompt: this.getTeammateSystemPrompt(),
    });

    // Communication Bus 初期化（抽象化されたインターフェースを使用）
    if (!config.backend) {
      throw new Error('Backend is required for TeammateAgent');
    }
    this.commBus = config.backend;
  }

  private getTeammateSystemPrompt(): string {
    return `You are a teammate agent. Your responsibilities:
1. Receive subtasks from the Lead agent
2. Execute the subtask using available tools
3. Report results back to the Lead agent
4. Request approval for any significant changes

You work in the directory: ${this.workingDir}

Your agent ID is: ${this.agentId}
Your team name is: ${this.teamName}

Always report your progress and results to the Lead agent.`;
  }

  async start(): Promise<void> {
    console.log(`[Teammate ${this.agentId}] Starting...`);
    this.isRunning = true;

    // メッセージ処理ループを開始
    this.processMessages();

    console.log(`[Teammate ${this.agentId}] Started successfully. Ready to receive subtasks.`);
  }

  async stop(): Promise<void> {
    console.log(`[Teammate ${this.agentId}] Stopping...`);
    this.isRunning = false;

    // 通信バックエンドをクリーンアップ
    await this.commBus.close();

    console.log(`[Teammate ${this.agentId}] Stopped.`);
  }

  private async processMessages(): Promise<void> {
    while (this.isRunning) {
      try {
        const messages = await this.commBus.readMessages(this.agentId);

        for (const message of messages) {
          // 未読メッセージのみ処理
          if (message.status === 'pending' || message.status === 'delivered') {
            await this.handleMessage(message);
            // メッセージステータスを更新
            message.status = 'read';
            await this.commBus.writeMessage(this.agentId, message);
          }
        }

        // メッセージがなければ待機
        if (messages.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`[Teammate ${this.agentId}] Error processing messages:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    console.log(`[Teammate ${this.agentId}] Received message from ${message.from}:`, message.type);

    switch (message.type) {
      case 'command':
        await this.handleCommand(message);
        break;
      case 'approval':
        await this.handleApproval(message);
        break;
      case 'stop':
        await this.handleStop(message);
        break;
      default:
        console.log(`[Teammate ${this.agentId}] Unknown message type: ${message.type}`);
    }
  }

  private async handleCommand(message: Message): Promise<void> {
    const task = message.content.task || message.content;
    this.currentTask = task;
    this.assignedBy = message.from;

    console.log(`[Teammate ${this.agentId}] Subtask received: ${task}`);

    // 進捗を報告
    await this.reportProgress('started', `Started working on: ${task}`);

    // タスクを処理して結果を生成
    const result = await this.executeTask(task);

    // 結果を送信元に返す
    await this.reportResult(result);

    console.log(`[Teammate ${this.agentId}] Subtask completed: ${task}`);
  }

  private async handleApproval(message: Message): Promise<void> {
    const { approved, reason } = message.content;

    if (approved) {
      console.log(`[Teammate ${this.agentId}] Plan approved: ${reason}`);
      // 承認されたプランに基づいて実行を継続
      await this.reportProgress('approved', `Plan approved: ${reason}`);
    } else {
      console.log(`[Teammate ${this.agentId}] Plan rejected: ${reason}`);
      // 拒否された場合、別のプランを提案する必要がある
      await this.reportProgress('rejected', `Plan rejected: ${reason}`);
    }
  }

  private async handleStop(message: Message): Promise<void> {
    console.log(`[Teammate ${this.agentId}] Stop requested`);
    await this.reportProgress('stopped', 'Task stopped by Lead');
    this.isRunning = false;
  }

  private async executeTask(task: string): Promise<any> {
    // 利用可能ツール定義
    const tools = this.getAvailableTools();

    // LLMを使用して応答を生成
    const result = await this.kernel.generateResponse(task, tools);

    // ツールコールがある場合は実行
    if (result.toolCalls && result.toolCalls.length > 0) {
      const toolResults: any[] = [];

      for (const toolCall of result.toolCalls) {
        // プロポーザルが必要なツールの場合は承認をリクエスト
        if (this.requiresApproval(toolCall)) {
          await this.requestApproval(toolCall);
          // ここでは簡易的に承認済みとして続行
          // 実際には承認待ちして応答を待つ必要がある
        }

        const toolResult = await this.executeTool(toolCall);
        toolResults.push({ tool: toolCall.name, result: toolResult });
      }

      // ツール実行後、再度応答を生成
      const followUp = await this.kernel.generateResponse('Continue based on the tool results.', tools);
      return {
        message: followUp.message,
        toolResults,
      };
    }

    return { message: result.message };
  }

  private requiresApproval(toolCall: any): boolean {
    // 特定のツールは承認が必要
    const requiresApprovalTools = ['bash', 'spawn_teammate'];
    return requiresApprovalTools.includes(toolCall.name);
  }

  private async requestApproval(toolCall: any): Promise<void> {
    const proposal: Message = {
      id: this.generateId(),
      from: this.agentId,
      to: this.assignedBy,
      type: 'proposal',
      content: {
        type: 'tool_call',
        tool: toolCall.name,
        arguments: toolCall.arguments,
        reason: `Requesting approval to execute ${toolCall.name}`,
      },
      timestamp: Date.now(),
      status: 'delivered',
    };

    await this.commBus.writeMessage(this.assignedBy, proposal);
    console.log(`[Teammate ${this.agentId}] Approval requested for ${toolCall.name}`);
  }

  private async reportProgress(status: string, message: string): Promise<void> {
    const progress: Message = {
      id: this.generateId(),
      from: this.agentId,
      to: this.assignedBy,
      type: 'report',
      content: {
        status,
        message,
        task: this.currentTask,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      status: 'delivered',
    };

    await this.commBus.writeMessage(this.assignedBy, progress);
  }

  private async reportResult(result: any): Promise<void> {
    const report: Message = {
      id: this.generateId(),
      from: this.agentId,
      to: this.assignedBy,
      type: 'report',
      content: {
        status: 'completed',
        result,
        task: this.currentTask,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      status: 'delivered',
    };

    await this.commBus.writeMessage(this.assignedBy, report);
  }

  private getAvailableTools(): any[] {
    return [
      {
        name: 'bash',
        description: 'Execute bash commands in the working directory',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The bash command to execute',
            },
          },
          required: ['command'],
        },
      },
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the file (relative to working directory)',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the file (relative to working directory)',
            },
            content: {
              type: 'string',
              description: 'The content to write to the file',
            },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'request_approval',
        description: 'Request approval from Lead for a proposed action',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'The action requiring approval',
            },
            reason: {
              type: 'string',
              description: 'Reason for the approval request',
            },
          },
          required: ['action', 'reason'],
        },
      },
    ];
  }

  private async executeTool(toolCall: any): Promise<any> {
    console.log(`[Teammate ${this.agentId}] Executing tool: ${toolCall.name}`);

    switch (toolCall.name) {
      case 'bash':
        return this.executeBash(toolCall.arguments.command);
      case 'read_file':
        return this.executeReadFile(toolCall.arguments.path);
      case 'write_file':
        return this.executeWriteFile(toolCall.arguments.path, toolCall.arguments.content);
      case 'request_approval':
        return this.executeRequestApproval(toolCall.arguments.action, toolCall.arguments.reason);
      default:
        throw new Error(`Unknown tool: ${toolCall.name}`);
    }
  }

  private async executeBash(command: string): Promise<any> {
    const { spawn } = await import('child_process');
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], {
        cwd: this.workingDir,
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
        });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async executeReadFile(filePath: string): Promise<any> {
    try {
      const fs = await import('fs/promises');
      const fullPath = path.resolve(this.workingDir, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async executeWriteFile(filePath: string, content: string): Promise<any> {
    try {
      const fs = await import('fs/promises');
      const fullPath = path.resolve(this.workingDir, filePath);
      await fs.writeFile(fullPath, content, 'utf-8');
      return { success: true, message: `Written to ${filePath}` };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async executeRequestApproval(action: string, reason: string): Promise<any> {
    const proposal: Message = {
      id: this.generateId(),
      from: this.agentId,
      to: this.assignedBy,
      type: 'proposal',
      content: { action, reason },
      timestamp: Date.now(),
      status: 'delivered',
    };

    await this.commBus.writeMessage(this.assignedBy, proposal);
    return { success: true, message: 'Approval requested' };
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getter メソッド
  getAgentId(): string {
    return this.agentId;
  }

  getTeamName(): string {
    return this.teamName;
  }

  getCurrentTask(): string {
    return this.currentTask;
  }

  isTaskRunning(): boolean {
    return this.currentTask !== '';
  }
}
