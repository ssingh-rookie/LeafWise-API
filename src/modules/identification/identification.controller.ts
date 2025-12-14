import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IdentificationService } from './identification.service';
import { IdentifyPlantDto } from './dto/identify-plant.dto';
import { IdentificationResponseDto } from './dto/identification-response.dto';

@ApiTags('identification')
@ApiBearerAuth('JWT-auth')
@Controller('identify')
@UseGuards(JwtAuthGuard)
export class IdentificationController {
  constructor(private readonly service: IdentificationService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 per hour for free tier
  @ApiOperation({
    summary: 'Identify plant from image',
    description:
      'Upload a plant image for AI-powered species identification. Returns species info and similar species for low-confidence matches.',
  })
  @ApiBody({ type: IdentifyPlantDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plant successfully identified',
    type: IdentificationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid image format or size exceeds 10MB',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (10 requests per hour)',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'AI identification providers unavailable',
  })
  async identify(
    @CurrentUser('id') userId: string,
    @Body() dto: IdentifyPlantDto,
  ): Promise<{ success: boolean; data: any; meta: any }> {
    const result = await this.service.identify(userId, dto);

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }
}
