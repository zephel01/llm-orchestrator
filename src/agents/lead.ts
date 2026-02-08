// Lead Agent - チームリーダー

import { AgentKernel } from '../agent-kernel/index.js';
import { FileCommunicationBus, Message } from '../communication/index.js';
import { createProvider } from '../providers/index.js';
import { TeamConfig } from '../team-manager/index.js';
import { spawn } from 'child_process';
import * as path from 'path';

export interface LeadAgentConfig {
  teamName: string;
  teamConfig: TeamConfig;
  workingDir?: string;
}

export class LeadAgent {
  private kernel: AgentKernel;
  private commBus: FileCommunicationBus;
  private teamName: string;
  private teamConfig: TeamConfig;
  private workingDir: string;
  private isRunning: boolean = false;

  constructor(config: LeadAgentConfig) {
    this.teamName = config.teamName;
    this.teamConfig = config.teamConfig;
    this.workingDir = config.workingDir || process.cwd();

    // プロバイダー作成
    const provider = createProvider({
      type: this.teamConfig.leadProvider.type,
      model: this.teamConfig.leadProvider.model,
    });

    // Kernel 初期化
    this.kernel = new AgentKernel({
      agentId: 'lead',
      provider,
      systemPrompt: this.getLeadSystemPrompt(),
    });

    // Communication Bus 初期化
    this.commBus = new FileCommunicationBus(this.teamName);
  }

  private getLeadSystemPrompt(): string {
    return `You are the Lead agent of a multi-agent team. Your responsibilities:
1. Receive tasks from the user
2. Break down complex tasks into subtasks
3. Assign subtasks to teammate agents
4. Review and approve plans from teammates
5. Integrate results and provide final output to the user

You work in the directory: ${this.workingDir}

Always think step by step and be clear in your communications.
Use tools to execute commands and manipulate files when necessary.`;
  }

  async start(): Promise<void> {
    console.log(`[Lead] Starting...`);
    await this.commBus.initialize();
    this.isRunning = true;

    // メッセージ処理ループを開始
    this.processMessages();

    console.log(`[Lead] Started successfully. Ready to receive tasks.`);
  }

  async stop(): Promise<void> {
    console.log(`[Lead] Stopping...`);
    this.isRunning = false;
    console.log(`[Lead] Stopped.`);
  }

  private async processMessages(): Promise<void> {
    while (this.isRunning) {
      try {
        const messages = await this.commBus.read('lead');

        for (const message of messages) {
          await this.handleMessage(message);
          await this.commBus.markRead('lead', message.id);
        }

        // メッセージがなければ待機
        if (messages.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('[Lead] Error processing messages:', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    console.log(`[Lead] Received message from ${message.from}:`, message.type);

    switch (message.type) {
      case 'command':
        await this.handleCommand(message);
        break;
      case 'proposal':
        await this.handleProposal(message);
        break;
      case 'report':
        await this.handleReport(message);
        break;
      default:
        console.log(`[Lead] Unknown message type: ${message.type}`);
    }
  }

  private async handleCommand(message: Message): Promise<void> {
    const task = message.content.task || message.content;

    console.log(`[Lead] Task received: ${task}`);

    // タスクを処理して応答を生成
    const response = await this.generateTaskResponse(task);

    // 結果を送信元に返す
    if (message.from !== 'user') {
      await this.commBus.write(message.from, {
        id: this.generateId(),
        from: 'lead',
        to: message.from,
        type: 'response',
        content: { message: response },
        timestamp: Date.now(),
        status: 'delivered',
      });
    } else {
      console.log(`[Lead] Response: ${response}`);
    }
  }

  private async handleProposal(message: Message): Promise<void> {
    console.log(`[Lead] Proposal received from ${message.from}`);
    console.log(`[Lead] Plan: ${message.content.plan}`);

    // Phase 1 では自動承認（将来的には基準に基づいた審査）
    const approved = true;
    const reason = approved ? 'Plan looks good' : 'Plan needs revision';

    const approvalMessage: Message = {
      id: this.generateId(),
      from: 'lead',
      to: message.from,
      type: 'approval',
      content: { approved, reason },
      timestamp: Date.now(),
      status: 'delivered',
    };

    await this.commBus.write(message.from, approvalMessage);
    console.log(`[Lead] Proposal ${approved ? 'approved' : 'rejected'}`);
  }

  private async handleReport(message: Message): Promise<void> {
    console.log(`[Lead] Report received from ${message.from}`);
    console.log(`[Lead] Result:`, message.content);
  }

  private async generateTaskResponse(task: string): Promise<string> {
    // 利用可能ツール定義
    const tools = this.getAvailableTools();

    // LLMを使用して応答を生成
    const result = await this.kernel.generateResponse(task, tools);

    // ツールコールがある場合は実行
    if (result.toolCalls && result.toolCalls.length > 0) {
      for (const toolCall of result.toolCalls) {
        await this.executeTool(toolCall);
      }

      // ツール実行後、再度応答を生成
      const followUp = await this.kernel.generateResponse('Continue based on the tool results.', tools);
      return followUp.message;
    }

    return result.message;
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
        name: 'spawn_teammate',
        description: 'Create a new teammate agent to handle a subtask',
        parameters: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: 'The subtask to assign to the teammate',
            },
          },
          required: ['task'],
        },
      },
    ];
  }

  private async executeTool(toolCall: any): Promise<any> {
    console.log(`[Lead] Executing tool: ${toolCall.name}`);

    switch (toolCall.name) {
      case 'bash':
        return this.executeBash(toolCall.arguments.command);
      case 'read_file':
        return this.executeReadFile(toolCall.arguments.path);
      case 'write_file':
        return this.executeWriteFile(toolCall.arguments.path, toolCall.arguments.content);
      case 'spawn_teammate':
        return this.executeSpawnTeammate(toolCall.arguments.task);
      default:
        throw new Error(`Unknown tool: ${toolCall.name}`);
    }
  }

  private async executeBash(command: string): Promise<any> {
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

  private async executeSpawnTeammate(task: string): Promise<any> {
    // Phase 1 ではチームメイトのspawnは未実装
    // Phase 2 で実装
    return {
      success: true,
      message: `Teammate spawn requested for task: ${task} (not implemented in Phase 1)`,
    };
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
