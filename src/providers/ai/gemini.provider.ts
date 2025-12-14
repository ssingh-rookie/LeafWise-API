import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ============================================================================
// Interfaces
// ============================================================================

export interface GeminiIdentificationResult {
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
  isFallback: true;
}

// ============================================================================
// Error Class
// ============================================================================

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly isRetryable: boolean = false,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

// ============================================================================
// Provider Implementation
// ============================================================================

@Injectable()
export class GeminiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private client: any | null = null;
  private model: any | null = null;
  private readonly modelName: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.modelName = this.config.get<string>('ai.gemini.defaultModel', 'gemini-2.0-flash-exp');
    this.apiKey = this.config.getOrThrow<string>('ai.gemini.apiKey');
  }

  // Lazy initialization for serverless optimization
  private async getClient(): Promise<any> {
    if (!this.client) {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      this.client = new GoogleGenerativeAI(this.apiKey);
    }
    return this.client;
  }

  private async getModel(): Promise<any> {
    if (!this.model) {
      const client = await this.getClient();
      this.model = client.getGenerativeModel({ model: this.modelName });
    }
    return this.model;
  }

  async identifyPlant(images: string[]): Promise<GeminiIdentificationResult> {
    const startTime = Date.now();
    this.logger.debug(
      `Starting Gemini plant identification (fallback) with ${images.length} image(s)`,
    );

    try {
      const model = await this.getModel();

      // Prepare all images as inline data parts
      const imageParts = images.map((img) => ({
        inlineData: {
          data: this.normalizeBase64(img),
          mimeType: 'image/jpeg',
        },
      }));

      const prompt =
        images.length > 1
          ? `Analyze these ${images.length} plant images (showing the same plant from different angles) and identify the species. Respond ONLY with a valid JSON object in this exact format, no other text:
{
  "scientificName": "The botanical/scientific name",
  "commonNames": ["Most common name", "Other common names"],
  "family": "Plant family name",
  "genus": "Plant genus name",
  "confidence": 0.0 to 1.0 confidence score
}

If you cannot identify the plant with reasonable confidence, set confidence to 0.3 or lower.`
          : `Analyze this plant image and identify the species. Respond ONLY with a valid JSON object in this exact format, no other text:
{
  "scientificName": "The botanical/scientific name",
  "commonNames": ["Most common name", "Other common names"],
  "family": "Plant family name",
  "genus": "Plant genus name",
  "confidence": 0.0 to 1.0 confidence score
}

If you cannot identify the plant with reasonable confidence, set confidence to 0.3 or lower.`;

      const result = await model.generateContent([prompt, ...imageParts]);

      const latency = Date.now() - startTime;
      this.logger.debug(`Gemini identification completed in ${latency}ms`);

      return this.parseResponse(result.response.text());
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error(`Gemini identification failed after ${latency}ms`, error);
      throw this.wrapError(error);
    }
  }

  private normalizeBase64(imageBase64: string): string {
    if (imageBase64.startsWith('data:')) {
      return imageBase64.split(',')[1];
    }
    return imageBase64;
  }

  private parseResponse(responseText: string): GeminiIdentificationResult {
    try {
      // Extract JSON from possible markdown code blocks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        species: {
          scientificName: parsed.scientificName || 'Unknown',
          commonNames: Array.isArray(parsed.commonNames) ? parsed.commonNames : [],
          family: parsed.family || 'Unknown',
          genus: parsed.genus || 'Unknown',
          confidence: Math.min(Math.max(parsed.confidence || 0, 0), 1),
        },
        similarSpecies: [], // Gemini doesn't provide alternatives in this format
        isFallback: true,
      };
    } catch (parseError) {
      this.logger.warn('Failed to parse Gemini response as JSON', parseError);
      return {
        species: {
          scientificName: 'Unknown',
          commonNames: [],
          family: 'Unknown',
          genus: 'Unknown',
          confidence: 0,
        },
        similarSpecies: [],
        isFallback: true,
      };
    }
  }

  private wrapError(error: unknown): GeminiError {
    if (error instanceof GeminiError) return error;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('quota') || errorMessage.includes('rate')) {
      return new GeminiError('Gemini rate limit exceeded', 'RATE_LIMIT', true, error as Error);
    }
    if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      return new GeminiError('Invalid Gemini API key', 'AUTH_ERROR', false, error as Error);
    }

    return new GeminiError(errorMessage, 'UNKNOWN_ERROR', true, error as Error);
  }
}
