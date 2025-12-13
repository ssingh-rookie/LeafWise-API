# LeafWise API - AI Integration Guide

> **Reference Document for AI Agents**
> This document defines patterns for integrating with AI providers.

## Table of Contents

1. [Overview](#overview)
2. [Provider Configuration](#provider-configuration)
3. [Plant.id Integration](#plantid-integration)
4. [Claude Integration](#claude-integration)
5. [OpenAI Integration](#openai-integration)
6. [Gemini Integration](#gemini-integration)
7. [AI Router Pattern](#ai-router-pattern)
8. [Context Building](#context-building)
9. [Prompt Engineering](#prompt-engineering)
10. [Cost Management](#cost-management)
11. [Error Handling & Fallbacks](#error-handling--fallbacks)

---

## Overview

### AI Provider Matrix

| Provider | Use Case | Model | Cost/Request |
|----------|----------|-------|--------------|
| **Plant.id** | Plant identification | Custom | €0.02-0.05 |
| **Plant.id** | Health assessment | Custom | €0.02-0.05 |
| **Claude** | Conversational AI | Haiku 3.5 | $0.001-0.003 |
| **Claude** | Complex analysis | Sonnet 4.5 | $0.01-0.02 |
| **OpenAI** | Symptom reasoning | GPT-4o mini | $0.002 |
| **OpenAI** | Embeddings | text-embedding-3-small | $0.00002 |
| **Gemini** | Vision fallback | Flash 2.5 | $0.003 |

### Provider Priority

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AI PROVIDER SELECTION                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Plant Identification:                                               │
│  ┌─────────┐ fail ┌─────────┐ fail ┌─────────────────┐             │
│  │Plant.id │─────►│ Gemini  │─────►│ Graceful Error  │             │
│  └─────────┘      └─────────┘      └─────────────────┘             │
│                                                                      │
│  Health Assessment:                                                  │
│  ┌─────────┐ fail ┌─────────────┐ fail ┌─────────────────┐         │
│  │Plant.id │─────►│ GPT-4o mini │─────►│ Graceful Error  │         │
│  └─────────┘      └─────────────┘      └─────────────────┘         │
│                                                                      │
│  Conversational:                                                     │
│  ┌─────────────┐ fail ┌─────────────┐ fail ┌───────────────────┐   │
│  │Claude Haiku │─────►│ GPT-4o mini │─────►│ Graceful Error    │   │
│  └─────────────┘      └─────────────┘      └───────────────────┘   │
│                                                                      │
│  Complex Analysis:                                                   │
│  ┌──────────────┐ fail ┌─────────┐ fail ┌───────────────────┐      │
│  │Claude Sonnet │─────►│ GPT-4o  │─────►│ Claude Haiku      │      │
│  └──────────────┘      └─────────┘      └───────────────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Provider Configuration

### Environment Variables

```bash
# .env
# Plant.id
PLANT_ID_API_KEY=your_plant_id_key
PLANT_ID_BASE_URL=https://api.plant.id/v3

# Anthropic (Claude)
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_BASE_URL=https://api.anthropic.com

# OpenAI
OPENAI_API_KEY=your_openai_key
OPENAI_BASE_URL=https://api.openai.com/v1

# Google (Gemini)
GOOGLE_AI_API_KEY=your_google_key
GOOGLE_AI_BASE_URL=https://generativelanguage.googleapis.com
```

### Configuration Module

```typescript
// src/config/ai.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  plantId: {
    apiKey: process.env.PLANT_ID_API_KEY,
    baseUrl: process.env.PLANT_ID_BASE_URL || 'https://api.plant.id/v3',
    timeout: 10000,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-haiku-20241022',
    upgradeModel: 'claude-sonnet-4-5-20250929',
    timeout: 30000,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
    timeout: 15000,
  },
  gemini: {
    apiKey: process.env.GOOGLE_AI_API_KEY,
    baseUrl: process.env.GOOGLE_AI_BASE_URL,
    defaultModel: 'gemini-2.0-flash-exp',
    timeout: 15000,
  },
}));
```

---

## Plant.id Integration

### Provider Implementation

```typescript
// src/providers/ai/plant-id.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';

export interface PlantIdIdentification {
  species: {
    scientificName: string;
    commonNames: string[];
    family: string;
    confidence: number;
  };
  similarSpecies: Array<{
    scientificName: string;
    commonName: string;
    confidence: number;
    imageUrl: string;
  }>;
  careSummary: {
    light: string;
    water: string;
    humidity: string;
    temperature: string;
    toxicity: string;
  };
}

export interface PlantIdHealthAssessment {
  isHealthy: boolean;
  issues: Array<{
    type: 'disease' | 'pest' | 'nutrient' | 'environmental';
    name: string;
    probability: number;
    description: string;
    cause: string;
    treatment: string;
  }>;
}

@Injectable()
export class PlantIdProvider {
  private readonly logger = new Logger(PlantIdProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {
    this.apiKey = this.config.get('ai.plantId.apiKey');
    this.baseUrl = this.config.get('ai.plantId.baseUrl');
    this.timeoutMs = this.config.get('ai.plantId.timeout');
  }

  async identify(imageBase64: string): Promise<PlantIdIdentification> {
    const startTime = Date.now();
    
    try {
      const response = await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/identification`,
          {
            images: [imageBase64],
            similar_images: true,
            plant_details: [
              'common_names',
              'taxonomy',
              'wiki_description',
              'edible_parts',
              'propagation_methods',
              'watering',
            ],
          },
          {
            headers: {
              'Api-Key': this.apiKey,
              'Content-Type': 'application/json',
            },
          },
        ).pipe(timeout(this.timeoutMs)),
      );

      const latency = Date.now() - startTime;
      this.logger.debug(`Plant.id identification completed in ${latency}ms`);

      return this.mapIdentificationResponse(response.data);
    } catch (error) {
      this.logger.error('Plant.id identification failed', error);
      throw new PlantIdError('Identification failed', error);
    }
  }

  async assessHealth(imageBase64: string): Promise<PlantIdHealthAssessment> {
    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/health_assessment`,
          {
            images: [imageBase64],
            disease_details: ['description', 'treatment', 'cause'],
            health_assessment: true,
            similar_images: true,
          },
          {
            headers: {
              'Api-Key': this.apiKey,
              'Content-Type': 'application/json',
            },
          },
        ).pipe(timeout(this.timeoutMs)),
      );

      const latency = Date.now() - startTime;
      this.logger.debug(`Plant.id health assessment completed in ${latency}ms`);

      return this.mapHealthResponse(response.data);
    } catch (error) {
      this.logger.error('Plant.id health assessment failed', error);
      throw new PlantIdError('Health assessment failed', error);
    }
  }

  private mapIdentificationResponse(data: any): PlantIdIdentification {
    const result = data.result;
    const topMatch = result.classification.suggestions[0];

    return {
      species: {
        scientificName: topMatch.name,
        commonNames: topMatch.details?.common_names || [],
        family: topMatch.details?.taxonomy?.family || 'Unknown',
        confidence: topMatch.probability,
      },
      similarSpecies: result.classification.suggestions.slice(1, 4).map((s: any) => ({
        scientificName: s.name,
        commonName: s.details?.common_names?.[0] || s.name,
        confidence: s.probability,
        imageUrl: s.similar_images?.[0]?.url || '',
      })),
      careSummary: {
        light: topMatch.details?.watering?.light || 'Unknown',
        water: topMatch.details?.watering?.watering || 'Unknown',
        humidity: topMatch.details?.watering?.humidity || 'Unknown',
        temperature: 'Average room temperature',
        toxicity: topMatch.details?.toxicity || 'Unknown',
      },
    };
  }

  private mapHealthResponse(data: any): PlantIdHealthAssessment {
    const health = data.result.health_assessment;
    
    return {
      isHealthy: health.is_healthy,
      issues: health.diseases?.map((d: any) => ({
        type: this.categorizeIssue(d.name),
        name: d.name,
        probability: d.probability,
        description: d.disease_details?.description || '',
        cause: d.disease_details?.cause || '',
        treatment: d.disease_details?.treatment || '',
      })) || [],
    };
  }

  private categorizeIssue(name: string): 'disease' | 'pest' | 'nutrient' | 'environmental' {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('mite') || nameLower.includes('aphid') || nameLower.includes('pest')) {
      return 'pest';
    }
    if (nameLower.includes('deficiency') || nameLower.includes('nutrient')) {
      return 'nutrient';
    }
    if (nameLower.includes('sunburn') || nameLower.includes('cold') || nameLower.includes('water')) {
      return 'environmental';
    }
    return 'disease';
  }
}

export class PlantIdError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'PlantIdError';
  }
}
```

---

## Claude Integration

### Provider Implementation

```typescript
// src/providers/ai/claude.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  systemPrompt: string;
  model?: 'haiku' | 'sonnet';
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeChatResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: string;
}

@Injectable()
export class ClaudeProvider {
  private readonly logger = new Logger(ClaudeProvider.name);
  private readonly client: Anthropic;
  private readonly models: { haiku: string; sonnet: string };

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.get('ai.anthropic.apiKey'),
    });
    this.models = {
      haiku: this.config.get('ai.anthropic.defaultModel'),
      sonnet: this.config.get('ai.anthropic.upgradeModel'),
    };
  }

  async chat(request: ClaudeChatRequest): Promise<ClaudeChatResponse> {
    const startTime = Date.now();
    const modelName = request.model === 'sonnet' ? this.models.sonnet : this.models.haiku;

    try {
      const response = await this.client.messages.create({
        model: modelName,
        max_tokens: request.maxTokens || 1024,
        temperature: request.temperature || 0.7,
        system: request.systemPrompt,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const latency = Date.now() - startTime;
      this.logger.debug(`Claude ${request.model} completed in ${latency}ms`);

      return {
        content: response.content[0].type === 'text' ? response.content[0].text : '',
        model: modelName,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        stopReason: response.stop_reason || 'end_turn',
      };
    } catch (error) {
      this.logger.error('Claude chat failed', error);
      throw new ClaudeError('Chat failed', error);
    }
  }

  async chatStream(
    request: ClaudeChatRequest,
    onChunk: (chunk: string) => void,
  ): Promise<ClaudeChatResponse> {
    const modelName = request.model === 'sonnet' ? this.models.sonnet : this.models.haiku;
    let fullContent = '';
    let usage = { inputTokens: 0, outputTokens: 0 };

    try {
      const stream = await this.client.messages.stream({
        model: modelName,
        max_tokens: request.maxTokens || 1024,
        temperature: request.temperature || 0.7,
        system: request.systemPrompt,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          fullContent += event.delta.text;
          onChunk(event.delta.text);
        }
        if (event.type === 'message_delta' && event.usage) {
          usage.outputTokens = event.usage.output_tokens;
        }
      }

      const finalMessage = await stream.finalMessage();
      usage.inputTokens = finalMessage.usage.input_tokens;

      return {
        content: fullContent,
        model: modelName,
        usage,
        stopReason: finalMessage.stop_reason || 'end_turn',
      };
    } catch (error) {
      this.logger.error('Claude streaming chat failed', error);
      throw new ClaudeError('Streaming chat failed', error);
    }
  }
}

export class ClaudeError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'ClaudeError';
  }
}
```

---

## OpenAI Integration

### Provider Implementation

```typescript
// src/providers/ai/openai.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface OpenAIChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface OpenAIChatResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason: string;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokensUsed: number;
}

@Injectable()
export class OpenAIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly client: OpenAI;
  private readonly defaultModel: string;
  private readonly embeddingModel: string;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get('ai.openai.apiKey'),
    });
    this.defaultModel = this.config.get('ai.openai.defaultModel');
    this.embeddingModel = this.config.get('ai.openai.embeddingModel');
  }

  async chat(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: request.model || this.defaultModel,
        messages: request.messages,
        max_tokens: request.maxTokens || 1024,
        temperature: request.temperature || 0.7,
      });

      const latency = Date.now() - startTime;
      this.logger.debug(`OpenAI chat completed in ${latency}ms`);

      return {
        content: response.choices[0]?.message?.content || '',
        model: response.model,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
        },
        finishReason: response.choices[0]?.finish_reason || 'stop',
      };
    } catch (error) {
      this.logger.error('OpenAI chat failed', error);
      throw new OpenAIError('Chat failed', error);
    }
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now();

    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      const latency = Date.now() - startTime;
      this.logger.debug(`Embedding generated in ${latency}ms`);

      return {
        embedding: response.data[0].embedding,
        model: response.model,
        tokensUsed: response.usage.total_tokens,
      };
    } catch (error) {
      this.logger.error('Embedding generation failed', error);
      throw new OpenAIError('Embedding generation failed', error);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const startTime = Date.now();

    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: texts,
      });

      const latency = Date.now() - startTime;
      this.logger.debug(`${texts.length} embeddings generated in ${latency}ms`);

      return response.data.map((d, i) => ({
        embedding: d.embedding,
        model: response.model,
        tokensUsed: Math.floor(response.usage.total_tokens / texts.length),
      }));
    } catch (error) {
      this.logger.error('Batch embedding generation failed', error);
      throw new OpenAIError('Batch embedding generation failed', error);
    }
  }

  // Specialized method for symptom reasoning
  async analyzeSymptoms(
    plantSpecies: string,
    symptoms: string,
  ): Promise<{ reasoning: string; likelyIssues: string[] }> {
    const response = await this.chat({
      messages: [
        {
          role: 'system',
          content: `You are a plant pathology expert. Analyze symptoms and provide reasoning about likely issues. Be concise and specific.`,
        },
        {
          role: 'user',
          content: `Plant: ${plantSpecies}\nSymptoms: ${symptoms}\n\nProvide a brief analysis of likely causes and issues. Format as JSON with "reasoning" (string) and "likelyIssues" (array of strings).`,
        },
      ],
      temperature: 0.3,
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return {
        reasoning: response.content,
        likelyIssues: [],
      };
    }
  }
}

export class OpenAIError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}
```

---

## Gemini Integration

### Provider Implementation

```typescript
// src/providers/ai/gemini.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiVisionRequest {
  imageBase64: string;
  prompt: string;
}

export interface GeminiVisionResponse {
  content: string;
  model: string;
}

@Injectable()
export class GeminiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly client: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    this.client = new GoogleGenerativeAI(this.config.get('ai.gemini.apiKey'));
    this.modelName = this.config.get('ai.gemini.defaultModel');
  }

  async analyzeImage(request: GeminiVisionRequest): Promise<GeminiVisionResponse> {
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });

      const result = await model.generateContent([
        request.prompt,
        {
          inlineData: {
            data: request.imageBase64,
            mimeType: 'image/jpeg',
          },
        },
      ]);

      const latency = Date.now() - startTime;
      this.logger.debug(`Gemini vision analysis completed in ${latency}ms`);

      return {
        content: result.response.text(),
        model: this.modelName,
      };
    } catch (error) {
      this.logger.error('Gemini vision analysis failed', error);
      throw new GeminiError('Vision analysis failed', error);
    }
  }

  // Fallback plant identification using Gemini vision
  async identifyPlant(imageBase64: string): Promise<{
    scientificName: string;
    commonName: string;
    confidence: number;
    description: string;
  }> {
    const response = await this.analyzeImage({
      imageBase64,
      prompt: `Identify this plant. Respond in JSON format with:
      - scientificName: the scientific/botanical name
      - commonName: the most common name
      - confidence: your confidence level (0-1)
      - description: brief description of the plant
      
      If you cannot identify the plant, set confidence to 0.`,
    });

    try {
      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON in response');
    } catch {
      return {
        scientificName: 'Unknown',
        commonName: 'Unknown Plant',
        confidence: 0,
        description: response.content,
      };
    }
  }
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}
```

---

## AI Router Pattern

### Router Service

```typescript
// src/providers/ai/ai-router.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PlantIdProvider } from './plant-id.provider';
import { ClaudeProvider } from './claude.provider';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { UsageLogService } from '../../modules/usage/usage-log.service';

export type AITask =
  | 'identification'
  | 'health_assessment'
  | 'chat_simple'
  | 'chat_complex'
  | 'embedding'
  | 'symptom_reasoning';

@Injectable()
export class AIRouterService {
  private readonly logger = new Logger(AIRouterService.name);

  constructor(
    private readonly plantId: PlantIdProvider,
    private readonly claude: ClaudeProvider,
    private readonly openai: OpenAIProvider,
    private readonly gemini: GeminiProvider,
    private readonly usageLog: UsageLogService,
  ) {}

  async identifyPlant(userId: string, imageBase64: string) {
    const providers = [
      {
        name: 'plant-id',
        fn: () => this.plantId.identify(imageBase64),
      },
      {
        name: 'gemini',
        fn: () => this.gemini.identifyPlant(imageBase64),
      },
    ];

    return this.executeWithFallback(userId, 'identification', providers);
  }

  async assessHealth(userId: string, imageBase64: string, symptoms?: string) {
    const providers = [
      {
        name: 'plant-id',
        fn: () => this.plantId.assessHealth(imageBase64),
      },
      {
        name: 'openai',
        fn: async () => {
          // Fallback: use GPT-4o vision
          const result = await this.openai.chat({
            messages: [
              {
                role: 'system',
                content: 'You are a plant health expert. Analyze the described symptoms.',
              },
              {
                role: 'user',
                content: `Symptoms: ${symptoms || 'See image'}. Diagnose potential issues.`,
              },
            ],
          });
          return this.parseHealthFromText(result.content);
        },
      },
    ];

    return this.executeWithFallback(userId, 'health_assessment', providers);
  }

  async chat(
    userId: string,
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { complex?: boolean; stream?: boolean; onChunk?: (chunk: string) => void },
  ) {
    const model = options?.complex ? 'sonnet' : 'haiku';
    const task = options?.complex ? 'chat_complex' : 'chat_simple';

    const providers = [
      {
        name: 'claude',
        fn: async () => {
          if (options?.stream && options?.onChunk) {
            return this.claude.chatStream(
              { systemPrompt, messages, model },
              options.onChunk,
            );
          }
          return this.claude.chat({ systemPrompt, messages, model });
        },
      },
      {
        name: 'openai',
        fn: () =>
          this.openai.chat({
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
          }),
      },
    ];

    return this.executeWithFallback(userId, task, providers);
  }

  async generateEmbedding(userId: string, text: string) {
    // Embeddings don't have fallback - OpenAI only
    const startTime = Date.now();
    try {
      const result = await this.openai.generateEmbedding(text);
      await this.logUsage(userId, 'embedding', 'openai', Date.now() - startTime, true);
      return result;
    } catch (error) {
      await this.logUsage(userId, 'embedding', 'openai', Date.now() - startTime, false);
      throw error;
    }
  }

  private async executeWithFallback<T>(
    userId: string,
    task: AITask,
    providers: Array<{ name: string; fn: () => Promise<T> }>,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (const provider of providers) {
      const startTime = Date.now();
      try {
        const result = await provider.fn();
        await this.logUsage(userId, task, provider.name, Date.now() - startTime, true);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Provider ${provider.name} failed for ${task}: ${error.message}`,
        );
        await this.logUsage(
          userId,
          task,
          provider.name,
          Date.now() - startTime,
          false,
          error.message,
        );
      }
    }

    throw new AIRouterError(
      `All providers failed for ${task}`,
      lastError,
    );
  }

  private async logUsage(
    userId: string,
    action: string,
    provider: string,
    latencyMs: number,
    success: boolean,
    errorCode?: string,
  ): Promise<void> {
    await this.usageLog.log({
      userId,
      action,
      provider,
      latencyMs,
      success,
      errorCode,
    });
  }

  private parseHealthFromText(text: string) {
    // Parse GPT response into health assessment format
    return {
      isHealthy: !text.toLowerCase().includes('issue'),
      issues: [],
    };
  }
}

export class AIRouterError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'AIRouterError';
  }
}
```

---

## Context Building

### Context Service

```typescript
// src/modules/chat/context.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OpenAIProvider } from '../../providers/ai/openai.provider';

export interface ChatContext {
  user: UserContext;
  plant: PlantContext | null;
  conversationHistory: MessageContext[];
  relevantMemories: MemoryContext[];
  tokenCount: number;
}

interface UserContext {
  name: string;
  experienceLevel: string;
  location: string | null;
  homeType: string | null;
}

interface PlantContext {
  id: string;
  species: string;
  nickname: string | null;
  location: string;
  currentHealth: string;
  lastWatered: Date | null;
  recentIssues: Array<{ type: string; diagnosis: string }>;
}

interface MessageContext {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MemoryContext {
  content: string;
  type: string;
  similarity: number;
}

@Injectable()
export class ContextService {
  // Token budget allocation
  private readonly TOKEN_BUDGETS = {
    user: 200,
    plant: 500,
    history: 2000,
    memories: 1000,
    buffer: 300,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAIProvider,
  ) {}

  async buildContext(
    userId: string,
    query: string,
    plantId?: string,
    sessionId?: string,
  ): Promise<ChatContext> {
    // Parallel retrieval for performance
    const [user, plant, history, memories] = await Promise.all([
      this.getUserContext(userId),
      plantId ? this.getPlantContext(plantId, userId) : null,
      sessionId ? this.getConversationHistory(sessionId) : [],
      this.getRelevantMemories(userId, query),
    ]);

    const tokenCount = this.estimateTokenCount({ user, plant, history, memories });

    return {
      user,
      plant,
      conversationHistory: history,
      relevantMemories: memories,
      tokenCount,
    };
  }

  private async getUserContext(userId: string): Promise<UserContext> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        experienceLevel: true,
        city: true,
        homeType: true,
      },
    });

    return {
      name: user?.name || 'User',
      experienceLevel: user?.experienceLevel || 'beginner',
      location: user?.city || null,
      homeType: user?.homeType || null,
    };
  }

  private async getPlantContext(
    plantId: string,
    userId: string,
  ): Promise<PlantContext | null> {
    const plant = await this.prisma.client.plant.findFirst({
      where: { id: plantId, userId },
      include: {
        species: true,
        healthIssues: {
          where: { status: { in: ['active', 'treating'] } },
          take: 3,
          orderBy: { reportedAt: 'desc' },
        },
      },
    });

    if (!plant) return null;

    return {
      id: plant.id,
      species: plant.species.commonNames[0] || plant.species.scientificName,
      nickname: plant.nickname,
      location: plant.locationInHome,
      currentHealth: plant.currentHealth,
      lastWatered: plant.lastWatered,
      recentIssues: plant.healthIssues.map((i) => ({
        type: i.issueType,
        diagnosis: i.diagnosis,
      })),
    };
  }

  private async getConversationHistory(sessionId: string): Promise<MessageContext[]> {
    const messages = await this.prisma.client.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 10, // Last 10 messages
      select: {
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return messages.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.createdAt,
    }));
  }

  private async getRelevantMemories(
    userId: string,
    query: string,
  ): Promise<MemoryContext[]> {
    // Generate embedding for query
    const { embedding } = await this.openai.generateEmbedding(query);

    // Semantic search
    const memories = await this.prisma.client.$queryRaw<
      Array<{ content_text: string; content_type: string; similarity: number }>
    >`
      SELECT
        content_text,
        content_type,
        1 - (embedding <=> ${embedding}::vector) as similarity
      FROM semantic_memories
      WHERE user_id = ${userId}::uuid
        AND 1 - (embedding <=> ${embedding}::vector) > 0.7
      ORDER BY embedding <=> ${embedding}::vector
      LIMIT 5
    `;

    return memories.map((m) => ({
      content: m.content_text,
      type: m.content_type,
      similarity: m.similarity,
    }));
  }

  private estimateTokenCount(context: Partial<ChatContext>): number {
    // Rough estimation: ~4 characters per token
    let chars = 0;
    
    if (context.user) {
      chars += JSON.stringify(context.user).length;
    }
    if (context.plant) {
      chars += JSON.stringify(context.plant).length;
    }
    if (context.conversationHistory) {
      chars += context.conversationHistory
        .map((m) => m.content.length)
        .reduce((a, b) => a + b, 0);
    }
    if (context.relevantMemories) {
      chars += context.relevantMemories
        .map((m) => m.content.length)
        .reduce((a, b) => a + b, 0);
    }

    return Math.ceil(chars / 4);
  }
}
```

---

## Prompt Engineering

### System Prompts

```typescript
// src/providers/ai/prompts.ts

export const SYSTEM_PROMPTS = {
  // Main conversational assistant
  chatAssistant: (userContext: UserContext) => `You are LeafWise, a friendly and knowledgeable plant care assistant. 

Your personality:
- Warm, encouraging, and supportive
- Educational without being condescending
- ${userContext.experienceLevel === 'beginner' ? 'Use simple language and explain plant care basics' : 'Assume plant care knowledge and go into more detail'}

User context:
- Name: ${userContext.name}
- Experience: ${userContext.experienceLevel}
- Location: ${userContext.location || 'Unknown'}
- Home type: ${userContext.homeType || 'Unknown'}

Guidelines:
1. Always use guidance language: "This appears to be...", "Consider trying...", "Signs suggest..."
2. Never make definitive diagnostic claims
3. If recommending treatment, always mention when to seek professional help
4. Be specific with actionable advice
5. Keep responses concise (100-300 words typically)
6. Ask follow-up questions to better understand the situation

End responses with relevant follow-up questions when appropriate.`,

  // Health diagnosis assistant
  healthDiagnosis: (plantContext: PlantContext) => `You are a plant health specialist helping diagnose issues with a ${plantContext.species}.

Plant information:
- Species: ${plantContext.species}
${plantContext.nickname ? `- Nickname: ${plantContext.nickname}` : ''}
- Location: ${plantContext.location}
- Current health status: ${plantContext.currentHealth}
${plantContext.lastWatered ? `- Last watered: ${plantContext.lastWatered.toLocaleDateString()}` : ''}

Your task:
1. Analyze the described symptoms
2. Provide likely causes (ranked by probability)
3. Suggest treatment steps with priority levels
4. Include preventive measures

CRITICAL: Use guidance language only. Say "This appears consistent with..." not "This is...".
End with: "This guidance is for informational purposes only. For valuable plants, consult a certified specialist."`,

  // Care advice generator
  careAdvice: (plantContext: PlantContext) => `You are providing care advice for a ${plantContext.species}.

Plant details:
- Species: ${plantContext.species}
- Location in home: ${plantContext.location}
- Health: ${plantContext.currentHealth}

Provide specific, actionable care advice. Include:
1. Watering guidance based on season and conditions
2. Light requirements
3. Common mistakes to avoid
4. Signs of both undercare and overcare`,
};

export const formatContextForPrompt = (context: ChatContext): string => {
  let contextStr = '';

  if (context.plant) {
    contextStr += `\n[Current Plant: ${context.plant.nickname || context.plant.species}]
Species: ${context.plant.species}
Location: ${context.plant.location}
Health: ${context.plant.currentHealth}
${context.plant.lastWatered ? `Last watered: ${context.plant.lastWatered.toLocaleDateString()}` : ''}
${context.plant.recentIssues.length > 0 ? `Recent issues: ${context.plant.recentIssues.map(i => i.diagnosis).join(', ')}` : ''}`;
  }

  if (context.relevantMemories.length > 0) {
    contextStr += `\n\n[Relevant Past Information]`;
    for (const memory of context.relevantMemories) {
      contextStr += `\n- ${memory.content}`;
    }
  }

  return contextStr;
};
```

---

## Cost Management

### Cost Tracking

```typescript
// src/modules/usage/usage-log.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

// Cost per 1K tokens (approximate)
const COSTS = {
  'claude-haiku': { input: 0.00025, output: 0.00125 },
  'claude-sonnet': { input: 0.003, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'text-embedding-3-small': { input: 0.00002, output: 0 },
  'plant-id': { flat: 0.03 },
  'gemini-flash': { input: 0.000075, output: 0.0003 },
};

@Injectable()
export class UsageLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: {
    userId: string;
    action: string;
    provider: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs: number;
    success: boolean;
    errorCode?: string;
  }): Promise<void> {
    const cost = this.calculateCost(
      data.provider,
      data.model,
      data.inputTokens,
      data.outputTokens,
    );

    await this.prisma.client.usageLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        provider: data.provider,
        model: data.model,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        cost,
        latencyMs: data.latencyMs,
        success: data.success,
        errorCode: data.errorCode,
      },
    });
  }

  async getUserUsage(userId: string, period: 'day' | 'month'): Promise<{
    identifications: number;
    healthAssessments: number;
    chatMessages: number;
    totalCost: number;
  }> {
    const startDate = period === 'day'
      ? new Date(new Date().setHours(0, 0, 0, 0))
      : new Date(new Date().setDate(1));

    const usage = await this.prisma.client.usageLog.groupBy({
      by: ['action'],
      where: {
        userId,
        createdAt: { gte: startDate },
        success: true,
      },
      _count: true,
      _sum: { cost: true },
    });

    return {
      identifications: usage.find((u) => u.action === 'identification')?._count || 0,
      healthAssessments: usage.find((u) => u.action === 'health_assessment')?._count || 0,
      chatMessages: usage.find((u) => u.action.startsWith('chat'))?._count || 0,
      totalCost: usage.reduce((sum, u) => sum + (u._sum.cost || 0), 0),
    };
  }

  private calculateCost(
    provider: string,
    model?: string,
    inputTokens?: number,
    outputTokens?: number,
  ): number {
    if (provider === 'plant-id') {
      return COSTS['plant-id'].flat;
    }

    const modelKey = model?.includes('haiku')
      ? 'claude-haiku'
      : model?.includes('sonnet')
      ? 'claude-sonnet'
      : model?.includes('gpt-4o-mini')
      ? 'gpt-4o-mini'
      : model?.includes('gpt-4o')
      ? 'gpt-4o'
      : model?.includes('embedding')
      ? 'text-embedding-3-small'
      : 'gemini-flash';

    const costs = COSTS[modelKey as keyof typeof COSTS];
    if ('flat' in costs) return costs.flat;

    return (
      ((inputTokens || 0) / 1000) * costs.input +
      ((outputTokens || 0) / 1000) * costs.output
    );
  }
}
```

---

## Error Handling & Fallbacks

### Error Types

```typescript
// src/providers/ai/errors.ts
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly isRetryable: boolean,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class RateLimitError extends AIProviderError {
  constructor(provider: string, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, true);
    this.retryAfter = retryAfter;
  }
  retryAfter?: number;
}

export class TimeoutError extends AIProviderError {
  constructor(provider: string) {
    super(`Request timeout for ${provider}`, provider, true);
  }
}

export class InvalidResponseError extends AIProviderError {
  constructor(provider: string, details?: string) {
    super(`Invalid response from ${provider}: ${details}`, provider, false);
  }
}
```

### Retry Logic

```typescript
// src/providers/ai/retry.util.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = (e) => e instanceof AIProviderError && e.isRetryable,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!shouldRetry(lastError) || attempt === maxAttempts) {
        throw lastError;
      }

      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt - 1),
        maxDelayMs,
      );
      await sleep(delay);
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

---

*Last Updated: December 2025*
