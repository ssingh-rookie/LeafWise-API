// ============================================================================
// Prisma Service
// ============================================================================
// Handles database connections with serverless optimizations
// ============================================================================

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private _client: PrismaClient | null = null;

  /**
   * Lazy initialization of Prisma client
   * This is important for serverless environments to avoid
   * creating connections on module load
   */
  get client(): PrismaClient {
    if (!this._client) {
      this._client = new PrismaClient({
        log:
          process.env.NODE_ENV === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

    }

    return this._client;
  }

  async onModuleInit() {
    // Only connect in non-serverless environments
    // In serverless, we connect lazily on first query
    if (!process.env.VERCEL) {
      await this.connect();
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect() {
    try {
      await this.client.$connect();
      this.logger.log('Database connected');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async disconnect() {
    if (this._client) {
      await this._client.$disconnect();
      this._client = null;
      this.logger.log('Database disconnected');
    }
  }

  /**
   * Health check for the database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute a raw query with proper typing
   */
  async executeRaw<T = unknown>(query: string, ...values: unknown[]): Promise<T> {
    return this.client.$queryRawUnsafe<T>(query, ...values);
  }

  /**
   * Transaction helper with automatic rollback on error
   */
  async transaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
    options?: { timeout?: number },
  ): Promise<T> {
    return this.client.$transaction(fn, {
      timeout: options?.timeout || 10000,
    });
  }
}
