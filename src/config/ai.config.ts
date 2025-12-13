// ============================================================================
// AI Provider Configuration
// ============================================================================

import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  // Plant.id API
  plantId: {
    apiKey: process.env.PLANT_ID_API_KEY,
    baseUrl: process.env.PLANT_ID_BASE_URL || 'https://api.plant.id/v3',
    timeout: 10000,
  },

  // Anthropic (Claude)
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    models: {
      haiku: 'claude-3-5-haiku-20241022',
      sonnet: 'claude-sonnet-4-5-20250929',
    },
    defaultModel: 'claude-3-5-haiku-20241022',
    timeout: 30000,
    maxTokens: 4096,
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    models: {
      chat: 'gpt-4o-mini',
      chatAdvanced: 'gpt-4o',
      embedding: 'text-embedding-3-small',
    },
    defaultModel: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
    embeddingDimensions: 1536,
    timeout: 15000,
  },

  // Google AI (Gemini)
  gemini: {
    apiKey: process.env.GOOGLE_AI_API_KEY,
    baseUrl: process.env.GOOGLE_AI_BASE_URL,
    models: {
      flash: 'gemini-2.0-flash-exp',
      pro: 'gemini-1.5-pro',
    },
    defaultModel: 'gemini-2.0-flash-exp',
    timeout: 15000,
  },

  // Cost tracking (per 1K tokens or per request)
  costs: {
    'plant-id-identification': 0.03, // Flat rate per request
    'plant-id-health': 0.03,
    'claude-haiku-input': 0.00025,
    'claude-haiku-output': 0.00125,
    'claude-sonnet-input': 0.003,
    'claude-sonnet-output': 0.015,
    'gpt-4o-mini-input': 0.00015,
    'gpt-4o-mini-output': 0.0006,
    'gpt-4o-input': 0.005,
    'gpt-4o-output': 0.015,
    'embedding-3-small': 0.00002,
    'gemini-flash-input': 0.000075,
    'gemini-flash-output': 0.0003,
  },
}));
