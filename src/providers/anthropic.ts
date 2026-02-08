// Anthropic プロバイダー実装

import { LLMProvider, ChatParams, ChatResponse, Tool, ToolCall } from './interface';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    try {
      const response = await this.client.messages.create({
        model: params.model || 'claude-3-5-sonnet-20241022',
        max_tokens: params.maxTokens || 4096,
        messages: this.convertMessages(params.messages),
        temperature: params.temperature,
        tools: params.tools && params.tools.length > 0 ? this.convertTools(params.tools) : undefined,
      });

      const content = response.content;
      const textContent = content.find(c => c.type === 'text');

      return {
        message: {
          role: 'assistant',
          content: textContent?.type === 'text' ? textContent.text : '',
        },
        toolCalls: this.extractToolCalls(content),
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: response.stop_reason === 'tool_use' ? 'tool_calls' : (response.stop_reason as any),
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }

  private convertMessages(messages: any[]) {
    return messages
      .filter(m => m.role !== 'tool')
      .map(m => ({
        role: m.role,
        content: m.content,
      }));
  }

  private convertTools(tools: Tool[]) {
    return tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as any,
    }));
  }

  private extractToolCalls(content: any[]): ToolCall[] | undefined {
    const toolUses = content.filter(c => c.type === 'tool_use');
    if (toolUses.length === 0) return undefined;

    return toolUses.map(tu => ({
      id: tu.id,
      name: tu.name,
      arguments: tu.input,
    }));
  }

  countTokens(text: string): number {
    // 簡易的なトークンカウント（実際はより正確な方法が必要）
    return Math.ceil(text.length / 4);
  }
}
