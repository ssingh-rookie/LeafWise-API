import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabase: SupabaseClient;
  private readonly bucket = 'plant-photos';

  constructor(private readonly config: ConfigService) {
    this.supabase = createClient(
      this.config.get<string>('database.supabase.url')!,
      this.config.get<string>('database.supabase.serviceRoleKey')!,
    );
  }

  async uploadPhoto(
    userId: string,
    plantId: string,
    imageBase64: string,
    type: 'identification' | 'health' | 'progress' = 'progress',
  ): Promise<string> {
    const buffer = Buffer.from(imageBase64, 'base64');
    const filename = `${userId}/${plantId}/${type}-${Date.now()}.jpg`;

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      this.logger.error('Failed to upload photo', error);
      throw error;
    }

    return this.getPublicUrl(data.path);
  }

  async deletePhoto(path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(this.bucket).remove([path]);
    if (error) {
      this.logger.error('Failed to delete photo', error);
      throw error;
    }
  }

  getPublicUrl(path: string): string {
    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
