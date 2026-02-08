// Ollama プロバイダー実装（ローカルモデル）

import { LLMProvider, ChatParams, ChatResponse } from './interface';

export class OllamaProvider implements LLMProvider {
  name = 'ollama';
  private baseURL: string;
  private model: string;

  constructor(baseURL: string = 'http://localhost:11434', model: string = 'llama3.2') {
    this.baseURL = baseURL;
    this.model = model;
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: params.model || this.model,
          messages: params.messages,
          tools: params.tools,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      return {
        message: {
          role: 'assistant',
          content: data.message?.content || '',
        },
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        finishReason: data.done ? 'stop' : 'length',
      };
    } catch (error) {
      console.error('Ollama API error:', error);
      throw error;
    }
  }

  countTokens(text: string): number {
    // 簡易的なトークンカウント
    return Math.ceil(text.length / 4);
  }
}
