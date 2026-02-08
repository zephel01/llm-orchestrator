// Provider factory

import { LLMProvider, ChatParams } from './interface.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { OllamaProvider } from './ollama.js';
import { LMStudioProvider } from './lm-studio.js';
import { LlamaServerProvider } from './llama-server.js';

export type ProviderType = 'anthropic' | 'openai' | 'ollama' | 'lmstudio' | 'llama-server';

export interface ProviderConfig {
  type: ProviderType;
  model?: string;
  apiKey?: string | undefined;
  baseURL?: string;
}

/**
 * Create LLM provider based on type
 */
export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.type) {
    case 'anthropic':
      return new AnthropicProvider(config.apiKey || process.env.ANTHROPIC_API_KEY || '');

    case 'openai':
      return new OpenAIProvider(config.apiKey || process.env.OPENAI_API_KEY || '');

    case 'ollama':
      return new OllamaProvider(
        config.baseURL || 'http://localhost:11434',
        config.model || 'llama3.2:1b'
      );

    case 'lmstudio':
      return new LMStudioProvider(
        config.baseURL || 'http://localhost:1234',
        config.model || 'meta-llama-3.70b-instruct'
      );

    case 'llama-server':
      return new LlamaServerProvider(
        config.baseURL || 'http://localhost:8080',
        config.model || 'llama3.2:8b-instruct'
      );

    default:
      throw new Error(`Unknown provider type: ${(config as any).type}`);
  }
}

/**
 * Get available provider types
 */
export function getAvailableProviders(): ProviderType[] {
  return ['anthropic', 'openai', 'ollama', 'lmstudio', 'llama-server'];
}

/**
 * Get default model for provider
 */
export function getDefaultModel(type: ProviderType): string {
  switch (type) {
    case 'anthropic':
      return 'claude-3-5-sonnet-20241022';
    case 'openai':
      return 'gpt-4';
    case 'ollama':
      return 'llama3.2:1b';
    case 'lmstudio':
      return 'meta-llama-3.70b-instruct';
    case 'llama-server':
      return 'llama3.2:8b-instruct';
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}
