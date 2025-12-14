import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AIRouterService } from './ai-router.service';
import { PlantIdProvider } from './plant-id.provider';
import { GeminiProvider } from './gemini.provider';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 5,
    }),
  ],
  providers: [AIRouterService, PlantIdProvider, GeminiProvider],
  exports: [AIRouterService, PlantIdProvider, GeminiProvider],
})
export class AIModule {}
