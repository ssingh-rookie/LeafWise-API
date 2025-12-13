# LeafWise API - Deployment Guide

> **Reference Document for AI Agents**
> This document covers deployment procedures, environment configuration, and infrastructure setup.

## Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Vercel Deployment](#vercel-deployment)
5. [Supabase Configuration](#supabase-configuration)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ENVIRONMENTS                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    │
│   │   Development   │    │     Staging     │    │   Production    │    │
│   │   (Local)       │    │   (Preview)     │    │   (Main)        │    │
│   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘    │
│            │                      │                      │              │
│   ┌────────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐    │
│   │ Docker Compose  │    │  Vercel Preview │    │  Vercel Prod    │    │
│   │ PostgreSQL      │    │  + Staging DB   │    │  + Production   │    │
│   │ + pgvector      │    │                 │    │    Database     │    │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Environment Matrix

| Environment | Branch | URL | Database | Purpose |
|-------------|--------|-----|----------|---------|
| Local | - | localhost:3000 | Docker PostgreSQL | Development |
| Preview | PR branches | *.vercel.app | Staging Supabase | PR testing |
| Staging | develop | staging-api.leafwise.app | Staging Supabase | Integration |
| Production | main | api.leafwise.app | Production Supabase | Live |

---

## Environment Setup

### Required Environment Variables

```bash
# .env.example

# ============================================================================
# DATABASE
# ============================================================================
# Pooled connection (for application)
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:6543/postgres?pgbouncer=true"

# Direct connection (for migrations)
DIRECT_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"

# ============================================================================
# SUPABASE
# ============================================================================
SUPABASE_URL="https://[project].supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# ============================================================================
# AI PROVIDERS
# ============================================================================
PLANT_ID_API_KEY="your-plant-id-key"
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
GOOGLE_AI_API_KEY="AIza..."

# ============================================================================
# AUTHENTICATION
# ============================================================================
JWT_SECRET="your-jwt-secret-min-32-chars"
JWT_EXPIRATION="7d"

# ============================================================================
# APPLICATION
# ============================================================================
NODE_ENV="development"
LOG_LEVEL="debug"
PORT="3000"

# ============================================================================
# OPTIONAL: EXTERNAL SERVICES
# ============================================================================
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
SENTRY_DSN="https://..."
```

### Environment-Specific Configuration

```typescript
// src/config/app.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'debug',
  
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Serverless-specific
  isServerless: !!process.env.VERCEL,
  
  // Feature flags
  features: {
    enableStreaming: process.env.ENABLE_STREAMING !== 'false',
    enablePremiumFeatures: process.env.ENABLE_PREMIUM !== 'false',
  },
}));
```

---

## Local Development

### Prerequisites

- Node.js 20.x LTS
- pnpm 8.x
- Docker & Docker Compose
- Git

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/leafwise-api.git
cd leafwise-api

# 2. Install dependencies
pnpm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# 4. Start local database
pnpm docker:up

# 5. Run migrations
pnpm db:migrate:dev

# 6. Seed database
pnpm db:seed

# 7. Start development server
pnpm dev
```

### Docker Compose Configuration

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: leafwise-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: leafwise
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  # Optional: pgAdmin for database management
  pgadmin:
    image: dpage/pgadmin4
    container_name: leafwise-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@leafwise.app
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - '5050:80'
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Database Initialization Script

```sql
-- docker/init.sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS leafwise;
```

### NPM Scripts

```json
// package.json
{
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "start:prod": "node dist/main",
    
    "docker:up": "docker-compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker-compose -f docker/docker-compose.yml down",
    "docker:logs": "docker-compose -f docker/docker-compose.yml logs -f",
    
    "db:generate": "prisma generate",
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:push": "prisma db push",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    
    "lint": "eslint \"{src,test}/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

---

## Vercel Deployment

### Vercel Configuration

```json
// vercel.json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "installCommand": "pnpm install",
  "framework": null,
  "functions": {
    "dist/main.js": {
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/dist/main.js"
    },
    {
      "src": "/health",
      "dest": "/dist/main.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "regions": ["sfo1"]
}
```

### NestJS Serverless Adapter

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn'] 
      : ['log', 'error', 'warn', 'debug'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  // Swagger (non-production only)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('LeafWise API')
      .setDescription('AI-Powered Plant Care Assistant API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Vercel serverless handler
  if (process.env.VERCEL) {
    await app.init();
    return app;
  }

  // Local development
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
}

// Export for Vercel
let cachedApp: any;
export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    cachedApp = await bootstrap();
  }
  const instance = cachedApp.getHttpAdapter().getInstance();
  return instance(req, res);
}

// Local execution
if (!process.env.VERCEL) {
  bootstrap();
}
```

### Vercel CLI Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Deploy preview
vercel

# Deploy production
vercel --prod

# View logs
vercel logs [deployment-url]

# Set environment variables
vercel env add DATABASE_URL production
vercel env add ANTHROPIC_API_KEY production
```

### Environment Variables in Vercel

```bash
# Set via CLI
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development

# Or via Vercel Dashboard:
# Project Settings > Environment Variables
```

---

## Supabase Configuration

### Project Setup

1. Create project at [supabase.com](https://supabase.com)
2. Enable pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Get connection strings from Settings > Database

### Connection Pooling

```
# Pooled connection (PgBouncer) - for application
postgresql://postgres:[password]@db.[project].supabase.co:6543/postgres?pgbouncer=true

# Direct connection - for migrations
postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

### Row Level Security

```sql
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own plants"
  ON plants FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own plants"
  ON plants FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own plants"
  ON plants FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own plants"
  ON plants FOR DELETE
  USING (auth.uid()::text = user_id::text);
```

### Storage Buckets

```sql
-- Create storage bucket for plant photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('plant-photos', 'plant-photos', false);

-- Storage policy
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'plant-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'plant-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: leafwise_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Generate Prisma Client
        run: pnpm db:generate
        
      - name: Run linting
        run: pnpm lint
        
      - name: Run type check
        run: pnpm typecheck
        
      - name: Run migrations
        run: pnpm db:migrate:deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/leafwise_test
          
      - name: Run tests
        run: pnpm test:cov
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/leafwise_test
          JWT_SECRET: test-secret-for-ci
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  deploy-preview:
    needs: lint-and-test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          
  deploy-production:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Database Migration Workflow

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to migrate'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Run migrations
        run: pnpm db:migrate:deploy
        env:
          DATABASE_URL: ${{ secrets.DIRECT_DATABASE_URL }}
```

---

## Monitoring & Logging

### Structured Logging

```typescript
// src/common/logger/logger.service.ts
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  private formatMessage(level: string, message: string, context?: string, meta?: object) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      ...meta,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
    });
  }

  log(message: string, context?: string, meta?: object) {
    console.log(this.formatMessage('info', message, context, meta));
  }

  error(message: string, trace?: string, context?: string) {
    console.error(this.formatMessage('error', message, context, { trace }));
  }

  warn(message: string, context?: string) {
    console.warn(this.formatMessage('warn', message, context));
  }

  debug(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }
}
```

### Health Check Endpoint

```typescript
// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  @Get('ready')
  ready() {
    return { status: 'ready', timestamp: new Date().toISOString() };
  }

  @Get('live')
  live() {
    return { status: 'live', timestamp: new Date().toISOString() };
  }
}
```

### Vercel Analytics Integration

```typescript
// src/common/interceptors/analytics.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        
        // Log for Vercel Analytics
        console.log(JSON.stringify({
          type: 'request',
          method: request.method,
          path: request.url,
          duration,
          statusCode: context.switchToHttp().getResponse().statusCode,
          userId: request.user?.id,
          timestamp: new Date().toISOString(),
        }));
      }),
    );
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. Cold Start Timeouts

**Symptom:** First request after idle period times out

**Solutions:**
```typescript
// Reduce module initialization time
@Module({
  imports: [
    // Only import necessary modules
    ConfigModule.forRoot({ cache: true }), // Enable caching
  ],
})

// Use lazy loading for heavy dependencies
async loadAIProvider() {
  const { ClaudeProvider } = await import('./claude.provider');
  return new ClaudeProvider();
}
```

#### 2. Database Connection Issues

**Symptom:** "Too many connections" error

**Solution:** Ensure connection pooling is configured:
```bash
# Use pooled connection string
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"
```

```typescript
// Prisma configuration
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

#### 3. AI Provider Timeouts

**Symptom:** AI requests timing out

**Solution:** Implement proper timeout handling:
```typescript
const response = await Promise.race([
  this.claude.chat(request),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), 25000)
  ),
]);
```

#### 4. Memory Issues

**Symptom:** Function crashes with memory errors

**Solutions:**
```json
// vercel.json - Increase memory
{
  "functions": {
    "dist/main.js": {
      "memory": 1024  // or 3008 for Pro
    }
  }
}
```

```typescript
// Stream large responses instead of buffering
async *streamChat(request: ChatRequest) {
  for await (const chunk of this.claude.stream(request)) {
    yield chunk;
  }
}
```

### Debug Commands

```bash
# View Vercel logs in real-time
vercel logs --follow

# Check deployment status
vercel ls

# View function invocations
vercel inspect [deployment-url]

# Test locally with Vercel
vercel dev

# Check environment variables
vercel env ls
```

### Performance Checklist

- [ ] Connection pooling enabled
- [ ] Lazy loading for heavy modules
- [ ] Response compression enabled
- [ ] Proper timeout handling
- [ ] AI provider fallbacks configured
- [ ] Caching implemented where appropriate
- [ ] Database queries optimized (indexes)
- [ ] Image compression before AI calls

---

## Rollback Procedures

### Vercel Rollback

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or via dashboard:
# Vercel Dashboard > Deployments > ... > Promote to Production
```

### Database Rollback

```bash
# View migration history
pnpm prisma migrate status

# Rollback last migration (development only)
pnpm prisma migrate reset

# For production, create a new migration that reverts changes
pnpm prisma migrate dev --name revert_previous_changes
```

---

*Last Updated: December 2025*
