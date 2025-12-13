import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PlantsService {
  constructor(private readonly prisma: PrismaService) {}

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
