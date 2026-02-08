// llama.cpp (llama-server) プロバイダー実装

import { LLMProvider, ChatParams, ChatResponse, Message } from './interface.js';

export class LlamaServerProvider implements LLMProvider {
  name = 'llama-server';
  private baseURL: string;
  private model: string;

  constructor(baseURL: string = 'http://localhost:8080', model: string = 'llama-3.2:8b-instruct') {
    this.baseURL = baseURL;
    this.model = model;
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    try {
      // baseURL にパスが含まれているか確認
      const endpoint = this.baseURL.endsWith('/v1')
        ? `${this.baseURL}/chat/completions`
        : `${this.baseURL}/v1/chat/completions`;

      console.log(`[llama-server] Requesting endpoint: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: params.model || this.model,
          messages: params.messages,
          temperature: params.temperature || 0.7,
          max_tokens: params.maxTokens || 4096,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`llama-server API error: ${response.status} ${response.statusText}`);
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
      console.error('llama-server API error:', error);
      throw error;
    }
  }

  countTokens(text: string): number {
    // 簡易的なカウント（llama-server では API から取得可能）
    return Math.ceil(text.length / 4);
  }
}
