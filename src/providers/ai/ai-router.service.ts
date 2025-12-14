import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  PlantIdProvider,
  PlantIdIdentificationResult,
  PlantIdError,
} from './plant-id.provider';
import {
  GeminiProvider,
  GeminiIdentificationResult,
  GeminiError,
} from './gemini.provider';

// ============================================================================
// Types
// ============================================================================

export type IdentificationProvider = 'plant-id' | 'gemini';

export interface UnifiedIdentificationResult {
  species: {
    scientificName: string;
    commonNames: string[];
    family: string;
    genus: string;
    confidence: number;
  };
  similarSpecies: Array<{
    scientificName: string;
    commonName: string;
    confidence: number;
    imageUrl: string;
  }>;
  isFallback: boolean;
  provider: IdentificationProvider;
}

export class AIRouterError extends Error {
  constructor(
    message: string,
    public readonly attemptedProviders: string[],
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'AIRouterError';
  }
}

// ============================================================================
// Service Implementation
// ============================================================================

@Injectable()
export class AIRouterService {
  private readonly logger = new Logger(AIRouterService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly plantIdProvider: PlantIdProvider,
    private readonly geminiProvider: GeminiProvider,
  ) {}

  async identifyPlant(
    userId: string,
    images: string[],
  ): Promise<UnifiedIdentificationResult> {
    const attemptedProviders: string[] = [];
    let lastError: Error | null = null;

    this.logger.debug(
      `Starting identification with ${images.length} image(s) for user ${userId}`,
    );

    // Provider 1: Plant.id (primary)
    attemptedProviders.push('plant-id');
    const plantIdStartTime = Date.now();

    try {
      const result = await this.plantIdProvider.identify(images);
      await this.logUsage(
        userId,
        'identification',
        'plant-id',
        Date.now() - plantIdStartTime,
        true,
      );

      return this.mapPlantIdResult(result);
    } catch (error) {
      lastError = error as Error;
      await this.logUsage(
        userId,
        'identification',
        'plant-id',
        Date.now() - plantIdStartTime,
        false,
        (error as PlantIdError).code,
      );

      this.logger.warn(
        `Plant.id failed, attempting Gemini fallback: ${(error as Error).message}`,
      );
    }

    // Provider 2: Gemini (fallback)
    attemptedProviders.push('gemini');
    const geminiStartTime = Date.now();

    try {
      const result = await this.geminiProvider.identifyPlant(images);
      await this.logUsage(
        userId,
        'identification',
        'gemini',
        Date.now() - geminiStartTime,
        true,
      );

      return this.mapGeminiResult(result);
    } catch (error) {
      lastError = error as Error;
      await this.logUsage(
        userId,
        'identification',
        'gemini',
        Date.now() - geminiStartTime,
        false,
        (error as GeminiError).code,
      );

      this.logger.error('All identification providers failed');
    }

    // All providers failed
    throw new AIRouterError(
      'Plant identification failed - all providers unavailable',
      attemptedProviders,
      lastError ?? undefined,
    );
  }

  private mapPlantIdResult(
    result: PlantIdIdentificationResult,
  ): UnifiedIdentificationResult {
    return {
      species: {
        scientificName: result.species.scientificName,
        commonNames: result.species.commonNames,
        family: result.species.family,
        genus: result.species.genus,
        confidence: result.species.confidence,
      },
      similarSpecies: result.similarSpecies,
      isFallback: false,
      provider: 'plant-id',
    };
  }

  private mapGeminiResult(
    result: GeminiIdentificationResult,
  ): UnifiedIdentificationResult {
    return {
      species: {
        scientificName: result.species.scientificName,
        commonNames: result.species.commonNames,
        family: result.species.family,
        genus: result.species.genus,
        confidence: result.species.confidence,
      },
      similarSpecies: result.similarSpecies,
      isFallback: true,
      provider: 'gemini',
    };
  }

  private async logUsage(
    userId: string,
    action: string,
    provider: string,
    latencyMs: number,
    success: boolean,
    errorCode?: string,
  ): Promise<void> {
    try {
      await this.prisma.client.usageLog.create({
        data: {
          userId,
          action,
          provider,
          latencyMs,
          success,
          errorCode,
          cost: provider === 'plant-id' ? 0.03 : 0.003,
          endpoint: '/api/v1/identify',
        },
      });
    } catch (error) {
      // Don't fail the main operation if logging fails
      this.logger.error('Failed to log usage', error);
    }
  }

  // Existing stub methods - keep for future implementation
  async assessHealth(userId: string, imageBase64: string, symptoms?: string) {
    this.logger.log('Health assessment requested');
    throw new Error('Not implemented');
  }

  async chat(
    userId: string,
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { complex?: boolean },
  ) {
    this.logger.log('Chat requested');
    throw new Error('Not implemented');
  }

  async generateEmbedding(text: string) {
    this.logger.log('Embedding generation requested');
    throw new Error('Not implemented');
  }
}
