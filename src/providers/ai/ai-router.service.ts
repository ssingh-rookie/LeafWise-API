import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AIRouterService {
  private readonly logger = new Logger(AIRouterService.name);

  constructor(private readonly config: ConfigService) {}

  async identifyPlant(userId: string, imageBase64: string) {
    this.logger.log('Plant identification requested');
    // TODO: Implement with Plant.id and Gemini fallback
    throw new Error('Not implemented');
  }

  async assessHealth(userId: string, imageBase64: string, symptoms?: string) {
    this.logger.log('Health assessment requested');
    // TODO: Implement with Plant.id Health and OpenAI fallback
    throw new Error('Not implemented');
  }

  async chat(
    userId: string,
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { complex?: boolean },
  ) {
    this.logger.log('Chat requested');
    // TODO: Implement with Claude and OpenAI fallback
    throw new Error('Not implemented');
  }

  async generateEmbedding(text: string) {
    this.logger.log('Embedding generation requested');
    // TODO: Implement with OpenAI embeddings
    throw new Error('Not implemented');
  }
}
