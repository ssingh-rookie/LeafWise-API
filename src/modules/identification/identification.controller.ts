import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IdentificationService } from './identification.service';

@ApiTags('identification')
@ApiBearerAuth('JWT-auth')
@Controller('identify')
@UseGuards(JwtAuthGuard)
export class IdentificationController {
  constructor(private readonly service: IdentificationService) {}

  @Post()
  async identify(@CurrentUser('id') userId: string, @Body() body: { image: string }) {
    return this.service.identify(userId, body.image);
  }
}
