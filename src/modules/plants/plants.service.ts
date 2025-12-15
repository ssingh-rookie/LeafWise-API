import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePlantDto } from './dto';

@Injectable()
export class PlantsService {
  private readonly logger = new Logger(PlantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePlantDto) {
    // 1. Verify species exists
    const species = await this.prisma.client.species.findUnique({
      where: { id: dto.speciesId },
    });
    if (!species) {
      throw new NotFoundException('Species not found');
    }

    // 2. Generate default nickname if not provided
    const nickname = dto.nickname || (await this.generateDefaultNickname(userId, species));

    // 3. Calculate watering schedule from species data
    const wateringFrequencyDays = this.parseWateringDays(species.waterFrequency);
    const nextWaterDue = new Date();
    nextWaterDue.setDate(nextWaterDue.getDate() + wateringFrequencyDays);

    // 4. Create plant with transaction (includes photo if provided)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.prisma.client.$transaction(async (tx: any) => {
      const plant = await tx.plant.create({
        data: {
          userId,
          speciesId: dto.speciesId,
          nickname,
          locationInHome: dto.locationInHome,
          lightExposure: dto.lightExposure,
          currentHealth: 'healthy',
          wateringFrequencyDays,
          nextWaterDue,
          acquiredDate: dto.acquiredDate ? new Date(dto.acquiredDate) : new Date(),
          acquisitionMethod: dto.acquisitionMethod || 'unknown',
        },
      });

      // 5. Create photo record if identification photo URL was provided
      if (dto.identificationPhotoUrl) {
        await tx.plantPhoto.create({
          data: {
            plantId: plant.id,
            storageUrl: dto.identificationPhotoUrl,
            type: 'identification',
            takenAt: new Date(),
            fileSize: 0, // Unknown at this point
          },
        });
      }

      // Re-fetch with relations
      return tx.plant.findUnique({
        where: { id: plant.id },
        include: { species: true, photos: true },
      });
    });
  }

  private async generateDefaultNickname(
    userId: string,
    species: { id: string; commonNames: string[]; scientificName: string },
  ): Promise<string> {
    const commonName = species.commonNames?.[0] || species.scientificName;
    const existingCount = await this.prisma.client.plant.count({
      where: { userId, speciesId: species.id },
    });
    return existingCount > 0 ? `${commonName} ${existingCount + 1}` : commonName;
  }

  private parseWateringDays(waterFrequency: string): number {
    // Extract number from strings like "every 7-10 days" or "weekly"
    const match = waterFrequency.match(/(\d+)/);
    if (match) return parseInt(match[1], 10);
    if (waterFrequency.toLowerCase().includes('daily')) return 1;
    if (waterFrequency.toLowerCase().includes('weekly')) return 7;
    return 7; // Default fallback
  }

  async findAll(userId: string) {
    return this.prisma.client.plant.findMany({
      where: { userId },
      include: { species: true },
    });
  }

  async findOne(userId: string, id: string) {
    const plant = await this.prisma.client.plant.findFirst({
      where: { id, userId },
      include: { species: true, healthIssues: true, careLogs: true },
    });
    if (!plant) throw new NotFoundException('Plant not found');
    return plant;
  }
}
