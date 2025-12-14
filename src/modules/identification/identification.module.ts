import { Module } from '@nestjs/common';
import { IdentificationController } from './identification.controller';
import { IdentificationService } from './identification.service';
import { DatabaseModule } from '../../database/database.module';
import { StorageModule } from '../../providers/storage/storage.module';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [IdentificationController],
  providers: [IdentificationService],
  exports: [IdentificationService],
})
export class IdentificationModule {}
