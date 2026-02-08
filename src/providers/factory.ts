// プロバイダーファクトリー

import { LLMProvider } from './interface.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { OllamaProvider } from './ollama.js';

export interface ProviderConfig {
  type: 'anthropic' | 'openai' | 'ollama';
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.type) {
    case 'anthropic':
      if (!config.apiKey) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable.');
        return new AnthropicProvider(apiKey);
      }
      return new AnthropicProvider(config.apiKey);

    case 'openai':
      if (!config.apiKey) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
        return new OpenAIProvider(apiKey);
      }
      return new OpenAIProvider(config.apiKey);

    case 'ollama':
      return new OllamaProvider(config.baseURL, config.model);

    default:
      throw new Error(`Unknown provider type: ${(config as any).type}`);
  }
}
