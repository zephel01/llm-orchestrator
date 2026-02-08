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
      // Ollama は現在ツール機能（function calling）を完全にサポートしていない
      // そのため、メッセージのみを送る
      const body: any = {
        model: params.model || this.model,
        messages: params.messages,
        stream: false,
      };

      // ツール機能が利用可能な場合のみ追加する（将来的な拡張用）
      if (params.tools && params.tools.length > 0) {
        // ツール情報をシステムプロンプトに埋め込む
        const toolsDescription = params.tools.map(tool =>
          `${tool.name}: ${tool.description}\nParameters: ${JSON.stringify(tool.parameters)}`
        ).join('\n\n');

        // システムプロンプトがある場合、ツール情報を追加
        const hasSystemMessage = body.messages.some((msg: any) => msg.role === 'system');
        if (hasSystemMessage) {
          body.messages = body.messages.map((msg: any) => {
            if (msg.role === 'system') {
              return {
                ...msg,
                content: `${msg.content}\n\nAvailable tools:\n${toolsDescription}`
              };
            }
            return msg;
          });
        } else {
          body.messages.unshift({
            role: 'system',
            content: `You are a helpful AI assistant. You have access to the following tools:\n${toolsDescription}\n\nWhen you need to use a tool, describe which tool you want to use and what parameters you would pass to it.`
          });
        }
      }

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama API error response:', errorText);
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
