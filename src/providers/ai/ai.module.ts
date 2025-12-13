import { Module, Global } from '@nestjs/common';
import { AIRouterService } from './ai-router.service';

@Global()
@Module({
  providers: [AIRouterService],
  exports: [AIRouterService],
})
export class AIModule {}
