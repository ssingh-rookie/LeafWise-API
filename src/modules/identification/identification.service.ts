import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AIRouterService,
  UnifiedIdentificationResult,
  AIRouterError,
} from '../../providers/ai/ai-router.service';
import { StorageService } from '../../providers/storage/storage.service';
import { IdentifyPlantDto } from './dto/identify-plant.dto';

// ============================================================================
// Constants
// ============================================================================

const LOW_CONFIDENCE_THRESHOLD = 0.7;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const THUMBNAIL_SIZE = 300;

// ============================================================================
// Interfaces
// ============================================================================

export interface IdentificationResult {
  data: {
    species: {
      id: string | null;
      scientificName: string;
      commonNames: string[];
      family: string;
      confidence: number;
    };
    similarSpecies: Array<{
      scientificName: string;
      commonName: string;
      confidence: number;
      imageUrl: string | null;
    }>;
    photo: {
      url: string;
      thumbnailUrl: string;
    };
  };
  meta: {
    provider: 'plant-id' | 'gemini';
    processingTimeMs: number;
  };
}

// ============================================================================
// Service Implementation
// ============================================================================

@Injectable()
export class IdentificationService {
  private readonly logger = new Logger(IdentificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRouter: AIRouterService,
    private readonly storage: StorageService,
  ) {}

  async identify(userId: string, dto: IdentifyPlantDto): Promise<IdentificationResult> {
    const startTime = Date.now();
    this.logger.log(
      `Starting plant identification for user ${userId} with ${dto.images.length} image(s)`,
    );

    // Validate each image size
    dto.images.forEach((img, index) => this.validateImageSize(img, index));

    // Normalize all base64 images (strip data URI prefix if present)
    const normalizedImages = dto.images.map((img) => this.normalizeBase64(img));

    // Run AI identification and image upload in parallel
    // Upload only the first/primary image to storage
    const [identificationResult, photoUrls] = await Promise.all([
      this.runIdentification(userId, normalizedImages),
      this.uploadImages(userId, normalizedImages[0]),
    ]);

    // Find or create species in database
    const speciesId = await this.findOrCreateSpecies(identificationResult);

    // Determine if we should include similar species
    const includeSimilar = identificationResult.species.confidence < LOW_CONFIDENCE_THRESHOLD;

    const processingTimeMs = Date.now() - startTime;
    this.logger.log(
      `Identification completed in ${processingTimeMs}ms, provider: ${identificationResult.provider}`,
    );

    return {
      data: {
        species: {
          id: speciesId,
          scientificName: identificationResult.species.scientificName,
          commonNames: identificationResult.species.commonNames,
          family: identificationResult.species.family,
          confidence: identificationResult.species.confidence,
        },
        similarSpecies: includeSimilar ? identificationResult.similarSpecies.slice(0, 5) : [],
        photo: photoUrls,
      },
      meta: {
        provider: identificationResult.provider,
        processingTimeMs,
      },
    };
  }

  private validateImageSize(imageBase64: string, index: number = 0): void {
    const base64Data = this.normalizeBase64(imageBase64);
    // Estimate decoded size (base64 is ~4/3 larger than binary)
    const estimatedBytes = Math.ceil(base64Data.length * 0.75);

    if (estimatedBytes > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException({
        code: 'IMAGE_TOO_LARGE',
        message: `Image ${index + 1} exceeds maximum size of 10MB`,
        maxSizeBytes: MAX_IMAGE_SIZE_BYTES,
        imageIndex: index,
      });
    }
  }

  private normalizeBase64(imageBase64: string): string {
    if (imageBase64.startsWith('data:')) {
      return imageBase64.split(',')[1];
    }
    return imageBase64;
  }

  private async runIdentification(
    userId: string,
    images: string[],
  ): Promise<UnifiedIdentificationResult> {
    try {
      return await this.aiRouter.identifyPlant(userId, images);
    } catch (error) {
      if (error instanceof AIRouterError) {
        throw new ServiceUnavailableException({
          code: 'AI_UNAVAILABLE',
          message: 'Plant identification service is temporarily unavailable',
          attemptedProviders: error.attemptedProviders,
        });
      }
      throw error;
    }
  }

  private async uploadImages(
    userId: string,
    imageBase64: string,
  ): Promise<{ url: string; thumbnailUrl: string }> {
    // Use a temporary ID for storage path since we don't have a plant yet
    const tempId = `temp-${Date.now()}`;

    try {
      // Upload original image
      const url = await this.storage.uploadPhoto(userId, tempId, imageBase64, 'identification');

      // Generate and upload thumbnail
      const thumbnailBase64 = await this.generateThumbnail(imageBase64, THUMBNAIL_SIZE);
      const thumbnailUrl = await this.storage.uploadPhoto(
        userId,
        tempId,
        thumbnailBase64,
        'identification',
      );

      return { url, thumbnailUrl };
    } catch (error) {
      this.logger.error('Failed to upload images', error);
      // Return empty URLs if upload fails - don't block identification
      return { url: '', thumbnailUrl: '' };
    }
  }

  private async generateThumbnail(imageBase64: string, size: number): Promise<string> {
    try {
      // Dynamic import for serverless optimization
      const sharp = (await import('sharp')).default;

      const buffer = Buffer.from(imageBase64, 'base64');

      const thumbnailBuffer = await sharp(buffer)
        .resize(size, size, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();

      return thumbnailBuffer.toString('base64');
    } catch (error) {
      this.logger.warn('Failed to generate thumbnail, using original', error);
      return imageBase64;
    }
  }

  /**
   * Normalize scientific name for consistent comparison
   * - Lowercase for case-insensitive matching
   * - Trim whitespace
   * - Normalize multiple spaces to single space
   */
  private normalizeScientificName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Extract genus from scientific name (first word)
   * Scientific name format: "Genus species" (e.g., "Monstera deliciosa")
   */
  private extractGenus(scientificName: string): string {
    const genus = scientificName.split(' ')[0];
    // Capitalize first letter for proper formatting
    return genus.charAt(0).toUpperCase() + genus.slice(1);
  }

  /**
   * Determine what fields should be updated on existing species
   * Only update if new data is more complete than existing
   */
  private getSpeciesUpdates(
    existing: {
      plantIdSpeciesId: string | null;
      description: string | null;
      toxicity: string | null;
      commonNames: string[];
    },
    newData: UnifiedIdentificationResult['species'],
  ): Record<string, unknown> {
    const updates: Record<string, unknown> = {};

    // Update plantIdSpeciesId if not set
    if (!existing.plantIdSpeciesId && newData.plantIdSpeciesId) {
      updates.plantIdSpeciesId = newData.plantIdSpeciesId;
    }

    // Update description if existing is null/empty
    if (!existing.description && newData.description) {
      updates.description = newData.description;
    }

    // Update toxicity if existing is null
    if (!existing.toxicity && newData.toxicity) {
      updates.toxicity = newData.toxicity;
    }

    // Merge common names (add new ones, deduplicated)
    if (newData.commonNames?.length) {
      const existingNames = new Set(existing.commonNames.map((n) => n.toLowerCase()));
      const newNames = newData.commonNames.filter((n) => !existingNames.has(n.toLowerCase()));
      if (newNames.length > 0) {
        updates.commonNames = [...existing.commonNames, ...newNames];
      }
    }

    return updates;
  }

  /**
   * Find existing species or create new one
   * - Uses case-insensitive search with normalized scientific name
   * - Enriches existing species with more complete data from AI provider
   * - Prevents duplicates across users
   */
  private async findOrCreateSpecies(result: UnifiedIdentificationResult): Promise<string | null> {
    const { species } = result;

    try {
      const normalizedName = this.normalizeScientificName(species.scientificName);

      // Try to find existing species by normalized scientific name (case-insensitive)
      const existingSpecies = await this.prisma.client.species.findFirst({
        where: {
          scientificName: {
            equals: normalizedName,
            mode: 'insensitive',
          },
        },
      });

      if (existingSpecies) {
        // Update existing species if new data is more complete
        const updates = this.getSpeciesUpdates(existingSpecies, species);

        if (Object.keys(updates).length > 0) {
          await this.prisma.client.species.update({
            where: { id: existingSpecies.id },
            data: updates,
          });
          this.logger.debug(
            `Updated species ${existingSpecies.id} with new data: ${Object.keys(updates).join(', ')}`,
          );
        }

        return existingSpecies.id;
      }

      // Create new species record with normalized name
      const newSpecies = await this.prisma.client.species.create({
        data: {
          scientificName: normalizedName,
          commonNames: species.commonNames || [],
          family: species.family || 'Unknown',
          genus: species.genus || this.extractGenus(normalizedName),
          lightRequirement: species.lightRequirement || 'Bright indirect light',
          waterFrequency: species.waterFrequency || 'When top inch of soil is dry',
          humidityLevel: species.humidityLevel || 'Medium',
          temperature: species.temperature || '65-75°F (18-24°C)',
          difficulty: species.difficulty || 'moderate',
          description: species.description,
          toxicity: species.toxicity,
          plantIdSpeciesId: species.plantIdSpeciesId,
        },
      });

      this.logger.debug(`Created new species record: ${newSpecies.id} (${normalizedName})`);
      return newSpecies.id;
    } catch (error) {
      this.logger.error('Failed to find/create species', error);
      // Don't block identification if species creation fails
      return null;
    }
  }
}
