// OpenAI プロバイダー実装

import { LLMProvider, ChatParams, ChatResponse, Tool, ToolCall } from './interface';
import OpenAI from 'openai';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: params.messages as any,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        tools: params.tools && params.tools.length > 0 ? this.convertTools(params.tools) : undefined,
        tool_choice: params.toolChoice === 'required' ? 'required' : (params.toolChoice === 'none' ? 'none' : 'auto'),
      });

      const choice = response.choices[0];

      return {
        message: {
          role: 'assistant',
          content: choice.message.content || '',
        },
        toolCalls: choice.message.tool_calls?.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        })),
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason as any,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  private convertTools(tools: Tool[]) {
    return tools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  countTokens(text: string): number {
    // 簡易的なトークンカウント（実際はtiktokenなどを使用）
    return Math.ceil(text.length / 4);
  }
}
