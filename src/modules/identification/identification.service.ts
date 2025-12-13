import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IdentificationService {
  private readonly logger = new Logger(IdentificationService.name);

  async identify(userId: string, imageBase64: string) {
    this.logger.log(`Identifying plant for user ${userId}`);
    // TODO: Implement with AI Router
    return { message: 'Implement with AI providers' };
  }
}
