import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, retry, timer } from 'rxjs';
import { AxiosResponse } from 'axios';

// ============================================================================
// Interfaces
// ============================================================================

export interface PlantIdSuggestion {
  id: string;
  name: string;
  probability: number;
  similar_images?: Array<{
    id: string;
    url: string;
    similarity: number;
  }>;
  details?: {
    common_names?: string[];
    taxonomy?: {
      family: string;
      genus: string;
      order: string;
      kingdom: string;
    };
    url?: string;
    description?: {
      value: string;
    };
    edible_parts?: string[];
    propagation_methods?: string[];
    watering?: {
      min: number;
      max: number;
    };
  };
}

export interface PlantIdApiResponse {
  access_token: string;
  model_version: string;
  input: {
    images: string[];
    latitude?: number;
    longitude?: number;
    similar_images: boolean;
  };
  result: {
    is_plant: {
      probability: number;
      binary: boolean;
      threshold: number;
    };
    classification: {
      suggestions: PlantIdSuggestion[];
    };
  };
  status: string;
  created: number;
  completed: number;
}

export interface PlantIdIdentificationResult {
  species: {
    id: string;
    scientificName: string;
    commonNames: string[];
    family: string;
    genus: string;
    confidence: number;
  };
  isPlant: boolean;
  isPlantProbability: number;
  similarSpecies: Array<{
    scientificName: string;
    commonName: string;
    confidence: number;
    imageUrl: string;
  }>;
  rawResponse: PlantIdApiResponse;
}

// ============================================================================
// Error Class
// ============================================================================

export class PlantIdError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly isRetryable: boolean = false,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'PlantIdError';
  }
}

// ============================================================================
// Provider Implementation
// ============================================================================

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
    this.apiKey = this.config.getOrThrow<string>('ai.plantId.apiKey');
    this.baseUrl = this.config.get<string>(
      'ai.plantId.baseUrl',
      'https://api.plant.id/v3',
    );
    this.timeoutMs = this.config.get<number>('ai.plantId.timeout', 10000);
  }

  async identify(images: string[]): Promise<PlantIdIdentificationResult> {
    const startTime = Date.now();
    this.logger.debug(
      `Starting Plant.id identification with ${images.length} image(s)`,
    );

    try {
      const response = await this.callApiWithRetry<PlantIdApiResponse>(
        '/identification',
        {
          images: images.map((img) => this.normalizeBase64(img)),
          similar_images: true,
        },
        {
          details:
            'common_names,url,description,taxonomy,edible_parts,watering,propagation_methods',
        },
      );

      const latency = Date.now() - startTime;
      this.logger.debug(`Plant.id identification completed in ${latency}ms`);

      return this.mapIdentificationResponse(response);
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error(
        `Plant.id identification failed after ${latency}ms`,
        error,
      );
      throw this.wrapError(error);
    }
  }

  private async callApiWithRetry<T>(
    endpoint: string,
    body: object,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response: AxiosResponse<T> = await firstValueFrom(
      this.http
        .post<T>(url, body, {
          headers: {
            'Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          params,
        })
        .pipe(
          timeout(this.timeoutMs),
          retry({
            count: 3,
            delay: (error, retryCount) => {
              // Exponential backoff: 1s, 2s, 4s
              const delayMs = Math.pow(2, retryCount - 1) * 1000;
              this.logger.warn(
                `Plant.id API retry ${retryCount}/3 after ${delayMs}ms: ${error.message}`,
              );
              return timer(delayMs);
            },
            resetOnSuccess: true,
          }),
        ),
    );

    return response.data;
  }

  private normalizeBase64(imageBase64: string): string {
    // Remove data URI prefix if present
    if (imageBase64.startsWith('data:')) {
      return imageBase64.split(',')[1];
    }
    return imageBase64;
  }

  private mapIdentificationResponse(
    response: PlantIdApiResponse,
  ): PlantIdIdentificationResult {
    const { result } = response;
    const topMatch = result.classification.suggestions[0];

    if (!topMatch) {
      throw new PlantIdError(
        'No plant species could be identified',
        'NO_MATCH',
        false,
      );
    }

    return {
      species: {
        id: topMatch.id,
        scientificName: topMatch.name,
        commonNames: topMatch.details?.common_names || [],
        family: topMatch.details?.taxonomy?.family || 'Unknown',
        genus: topMatch.details?.taxonomy?.genus || 'Unknown',
        confidence: topMatch.probability,
      },
      isPlant: result.is_plant.binary,
      isPlantProbability: result.is_plant.probability,
      similarSpecies: result.classification.suggestions.slice(1, 5).map((s) => ({
        scientificName: s.name,
        commonName: s.details?.common_names?.[0] || s.name,
        confidence: s.probability,
        imageUrl: s.similar_images?.[0]?.url || '',
      })),
      rawResponse: response,
    };
  }

  private wrapError(error: unknown): PlantIdError {
    if (error instanceof PlantIdError) return error;

    const axiosError = error as any;
    const status = axiosError?.response?.status;
    const message =
      axiosError?.response?.data?.message ||
      axiosError?.message ||
      'Unknown error';

    if (status === 401) {
      return new PlantIdError(
        'Invalid Plant.id API key',
        'AUTH_ERROR',
        false,
        axiosError,
      );
    }
    if (status === 429) {
      return new PlantIdError(
        'Plant.id rate limit exceeded',
        'RATE_LIMIT',
        true,
        axiosError,
      );
    }
    if (status >= 500) {
      return new PlantIdError(
        'Plant.id service unavailable',
        'SERVICE_ERROR',
        true,
        axiosError,
      );
    }
    if (
      axiosError?.code === 'ECONNABORTED' ||
      axiosError?.code === 'ETIMEDOUT'
    ) {
      return new PlantIdError(
        'Plant.id request timeout',
        'TIMEOUT',
        true,
        axiosError,
      );
    }

    return new PlantIdError(message, 'UNKNOWN_ERROR', false, axiosError);
  }
}
