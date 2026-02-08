// 共通LLMプロバイダーインターフェース

export interface LLMProvider {
  name: string;

  // 基本的なチャット補完
  chat(params: ChatParams): Promise<ChatResponse>;

  // ストリーミング補完（将来実装）
  chatStream?(params: ChatParams): AsyncIterable<ChatStreamChunk>;

  // トークン数カウント（利用可能な場合）
  countTokens?(text: string): number;
}

export interface ChatParams {
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  toolChoice?: 'auto' | 'required' | 'none';
}

export interface ChatResponse {
  message: Message;
  toolCalls?: ToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolResults?: any[];
}

export interface ChatStreamChunk {
  content: string;
  done: boolean;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}
