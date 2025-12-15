import { Controller, Get, Post, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlantsService } from './plants.service';
import { CreatePlantDto, PlantResponseDto } from './dto';

@ApiTags('plants')
@ApiBearerAuth('JWT-auth')
@Controller('plants')
@UseGuards(JwtAuthGuard)
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Post()
  @ApiOperation({ summary: 'Save plant to collection' })
  @ApiBody({ type: CreatePlantDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: PlantResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Species not found' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreatePlantDto) {
    const plant = await this.plantsService.create(userId, dto);
    return { success: true, data: { plant } };
  }

  @Get()
  @ApiOperation({ summary: 'Get all plants for user' })
  async findAll(@CurrentUser('id') userId: string) {
    const plants = await this.plantsService.findAll(userId);
    return { success: true, data: { plants } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific plant' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const plant = await this.plantsService.findOne(userId, id);
    return { success: true, data: { plant } };
  }
}
