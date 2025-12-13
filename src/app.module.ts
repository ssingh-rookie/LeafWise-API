// ============================================================================
// LeafWise API - Root Application Module
// ============================================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';

// Configuration
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import aiConfig from './config/ai.config';

// Core Modules
import { DatabaseModule } from './database/database.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PlantsModule } from './modules/plants/plants.module';
import { IdentificationModule } from './modules/identification/identification.module';
import { HealthModule } from './modules/health/health.module';
import { ChatModule } from './modules/chat/chat.module';
import { CareModule } from './modules/care/care.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';

// Provider Modules
import { AIModule } from './providers/ai/ai.module';
import { StorageModule } from './providers/storage/storage.module';

// Health Check
import { HealthCheckModule } from './modules/health-check/health-check.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, aiConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Event Emitter for cross-module communication
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Core
    DatabaseModule,

    // Providers
    AIModule,
    StorageModule,

    // Features
    AuthModule,
    UsersModule,
    PlantsModule,
    IdentificationModule,
    HealthModule,
    ChatModule,
    CareModule,
    SubscriptionsModule,

    // Health Check
    HealthCheckModule,
  ],
})
export class AppModule {}
