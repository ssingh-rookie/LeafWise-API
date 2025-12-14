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

  async identify(
    userId: string,
    dto: IdentifyPlantDto,
  ): Promise<IdentificationResult> {
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
    const includeSimilar =
      identificationResult.species.confidence < LOW_CONFIDENCE_THRESHOLD;

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
        similarSpecies: includeSimilar
          ? identificationResult.similarSpecies.slice(0, 5)
          : [],
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
      const url = await this.storage.uploadPhoto(
        userId,
        tempId,
        imageBase64,
        'identification',
      );

      // Generate and upload thumbnail
      const thumbnailBase64 = await this.generateThumbnail(
        imageBase64,
        THUMBNAIL_SIZE,
      );
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

  private async generateThumbnail(
    imageBase64: string,
    size: number,
  ): Promise<string> {
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

  private async findOrCreateSpecies(
    result: UnifiedIdentificationResult,
  ): Promise<string | null> {
    const { species } = result;

    try {
      // Try to find existing species by scientific name
      const existingSpecies = await this.prisma.client.species.findUnique({
        where: { scientificName: species.scientificName },
        select: { id: true },
      });

      if (existingSpecies) {
        return existingSpecies.id;
      }

      // Create new species record
      const newSpecies = await this.prisma.client.species.create({
        data: {
          scientificName: species.scientificName,
          commonNames: species.commonNames,
          family: species.family,
          genus: species.genus,
          // Default values for required fields
          lightRequirement: 'Bright indirect light',
          waterFrequency: 'When top inch of soil is dry',
          humidityLevel: 'Medium',
          temperature: '65-75°F (18-24°C)',
          difficulty: 'moderate',
        },
      });

      this.logger.debug(`Created new species record: ${newSpecies.id}`);
      return newSpecies.id;
    } catch (error) {
      this.logger.error('Failed to find/create species', error);
      // Don't block identification if species creation fails
      return null;
    }
  }
}
