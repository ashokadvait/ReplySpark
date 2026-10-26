import { ENV } from '../../config/env.js';
import { IAIProvider } from './ai.types.js';
import { GeminiAIProvider } from './gemini.provider.js';
import { MockAIProvider } from './mock.provider.js';

export * from './ai.types.js';

export function getAIProvider(): IAIProvider {
  if (ENV.AI_PROVIDER === 'gemini' && ENV.GEMINI_API_KEY) {
    return new GeminiAIProvider(ENV.GEMINI_API_KEY);
  }
  return new MockAIProvider();
}
