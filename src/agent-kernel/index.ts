// Agent Kernel - エージェントのコア実行環境

import { LLMProvider, Message, Tool, ToolCall } from '../providers/interface.js';

export interface KernelConfig {
  agentId: string;
  provider: LLMProvider;
  maxContextTokens?: number;
  systemPrompt?: string;
}

export class AgentKernel {
  private agentId: string;
  private provider: LLMProvider;
  private context: Message[] = [];
  private maxContextTokens: number;
  private systemPrompt: string;

  constructor(config: KernelConfig) {
    this.agentId = config.agentId;
    this.provider = config.provider;
    this.maxContextTokens = config.maxContextTokens || 100000;
    this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
  }

  private getDefaultSystemPrompt(): string {
    return `You are a helpful AI agent working as part of a team.
Your ID is ${this.agentId}.
Collaborate effectively with other team members to complete tasks.
Always be clear and concise in your communications.`;
  }

  addToContext(message: Message): void {
    this.context.push(message);
    this.maybeCompactContext();
  }

  getContext(): Message[] {
    return [...this.context];
  }

  async generateResponse(userMessage: string, tools?: Tool[]): Promise<ResponseResult> {
    // ユーザーメッセージをコンテキストに追加
    this.addToContext({
      role: 'user',
      content: userMessage,
    });

    // メッセージ配列を構築
    const messages: Message[] = [
      { role: 'system', content: this.systemPrompt },
      ...this.context,
    ];

    try {
      const response = await this.provider.chat({
        messages,
        tools,
        toolChoice: 'auto',
      });

      // アシスタントの応答をコンテキストに追加
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message.content,
      };
      this.addToContext(assistantMessage);

      return {
        message: response.message.content,
        toolCalls: response.toolCalls,
        usage: response.usage,
        finishReason: response.finishReason,
      };
    } catch (error) {
      console.error(`[${this.agentId}] Error generating response:`, error);
      throw error;
    }
  }

  private maybeCompactContext(): void {
    const estimatedTokens = this.estimateTokens(this.context);

    if (estimatedTokens > this.maxContextTokens) {
      console.log(`[${this.agentId}] Compacting context (tokens: ${estimatedTokens})`);
      this.compactContext();
    }
  }

  private compactContext(): void {
    // 古いメッセージの一部を要約で置き換える
    const splitPoint = Math.floor(this.context.length * 0.5);
    const oldMessages = this.context.slice(0, splitPoint);

    if (oldMessages.length > 0) {
      const summary = this.summarizeMessages(oldMessages);
      this.context = [
        { role: 'system', content: `[Summary of previous conversation]\n${summary}` },
        ...this.context.slice(splitPoint),
      ];
    }
  }

  private summarizeMessages(messages: Message[]): string {
    // 簡易的な要約（実際にはLLMを使用して要約する）
    return `Summarized ${messages.length} messages from earlier in the conversation.`;
  }

  private estimateTokens(messages: Message[]): number {
    // 簡易的なトークン推定
    const text = messages.map(m => m.content).join(' ');
    return Math.ceil(text.length / 4);
  }

  async executeToolCall(toolCall: ToolCall, toolExecutor: (name: string, args: any) => Promise<any>): Promise<any> {
    try {
      const result = await toolExecutor(toolCall.name, toolCall.arguments);

      // ツール結果をコンテキストに追加
      this.addToContext({
        role: 'tool',
        content: JSON.stringify(result),
        toolCallId: toolCall.id,
      });

      return result;
    } catch (error) {
      console.error(`[${this.agentId}] Error executing tool ${toolCall.name}:`, error);
      throw error;
    }
  }

  clearContext(): void {
    this.context = [];
  }

  getAgentId(): string {
    return this.agentId;
  }
}

export interface ResponseResult {
  message: string;
  toolCalls?: ToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}
