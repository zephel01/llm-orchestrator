// LM Studio プロバイダー実装

import { LLMProvider, ChatParams, ChatResponse, Message } from './interface.js';

export class LMStudioProvider implements LLMProvider {
  name = 'lmstudio';
  private baseURL: string;
  private model: string;

  constructor(baseURL: string = 'http://localhost:1234', model: string = 'meta-llama-3.2-3b-instruct') {
    this.baseURL = baseURL;
    this.model = model;
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    try {
      // baseURL にパスが含まれているか確認
      const endpoint = this.baseURL.endsWith('/v1')
        ? `${this.baseURL}/chat/completions`
        : `${this.baseURL}/v1/chat/completions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: params.model || this.model,
          messages: params.messages,
          temperature: params.temperature || 0.7,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      return {
        message: {
          role: 'assistant',
          content: data.choices[0]?.message?.content || '',
        },
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        finishReason: data.finish_reason || 'stop',
      };
    } catch (error) {
      console.error('LM Studio API error:', error);
      throw error;
    }
  }

  countTokens(text: string): number {
    // 簡易的なカウント（LM Studio では API から取得可能）
    return Math.ceil(text.length / 4);
  }
}
