# CLAUDE.md - LeafWise API Development Guide

> **This file is the primary reference for AI agents working on this codebase.**
> Read this file completely before making any changes.

## Project Overview

**LeafWise API** is a serverless NestJS backend powering an AI-driven plant care assistant mobile application. The API provides plant identification, health diagnosis, and personalized conversational guidance through multiple AI providers.

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | NestJS | 10.x |
| Runtime | Node.js | 20.x LTS |
| Language | TypeScript | 5.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL + pgvector | 16.x |
| Cloud DB | Supabase | - |
| Hosting | Vercel Serverless | - |
| Local Dev | Docker Compose | - |

### Key Documentation

Before working on specific areas, read the relevant documentation:

| Area | Document | When to Read |
|------|----------|--------------|
| System Design | `.claude/docs/ARCHITECTURE.md` | Always read first |
| API Contracts | `.claude/docs/API_SPEC.md` | When working on endpoints |
| Database | `.claude/docs/DATABASE.md` | When touching data models |
| AI Services | `.claude/docs/AI_INTEGRATION.md` | When working with AI providers |
| Code Style | `.claude/docs/CODING_STANDARDS.md` | Before writing any code |
| Deployment | `.claude/docs/DEPLOYMENT.md` | When deploying or configuring |

---

## Quick Start Commands

```bash
# Install dependencies
pnpm install

# Start local development (Docker + API)
pnpm dev

# Run database migrations (local)
pnpm db:migrate:dev

# Run database migrations (production)
pnpm db:migrate:deploy

# Generate Prisma client
pnpm db:generate

# Run tests
pnpm test

# Run linting
pnpm lint

# Build for production
pnpm build
```

---

## Project Structure

```
leafwise-api/
├── CLAUDE.md                    # THIS FILE - AI agent instructions
├── README.md                    # Human-readable project overview
├── .claude/                     # Claude Code configuration
│   └── docs/                    # Detailed documentation
│       ├── ARCHITECTURE.md      # System architecture
│       ├── API_SPEC.md          # API specifications
│       ├── DATABASE.md          # Database schema & design
│       ├── AI_INTEGRATION.md    # AI provider integration
│       ├── CODING_STANDARDS.md  # Code style guide
│       └── DEPLOYMENT.md        # Deployment procedures
│
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── migrations/              # Database migrations
│   └── seed.ts                  # Seed data
│
├── src/
│   ├── main.ts                  # Application entry point
│   ├── app.module.ts            # Root module
│   │
│   ├── common/                  # Shared utilities
│   │   ├── decorators/          # Custom decorators
│   │   ├── filters/             # Exception filters
│   │   ├── guards/              # Auth guards
│   │   ├── interceptors/        # Request/response interceptors
│   │   ├── pipes/               # Validation pipes
│   │   └── utils/               # Helper functions
│   │
│   ├── config/                  # Configuration
│   │   ├── app.config.ts        # App configuration
│   │   ├── database.config.ts   # Database configuration
│   │   └── ai.config.ts         # AI provider configuration
│   │
│   ├── modules/                 # Feature modules (microservices)
│   │   ├── auth/                # Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   └── dto/
│   │   │
│   │   ├── users/               # User management
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   └── dto/
│   │   │
│   │   ├── plants/              # Plant collection management
│   │   │   ├── plants.module.ts
│   │   │   ├── plants.controller.ts
│   │   │   ├── plants.service.ts
│   │   │   ├── plants.repository.ts
│   │   │   └── dto/
│   │   │
│   │   ├── identification/      # Plant ID (AI)
│   │   │   ├── identification.module.ts
│   │   │   ├── identification.controller.ts
│   │   │   ├── identification.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── health/              # Health diagnosis (AI)
│   │   │   ├── health.module.ts
│   │   │   ├── health.controller.ts
│   │   │   ├── health.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── chat/                # Conversational AI
│   │   │   ├── chat.module.ts
│   │   │   ├── chat.controller.ts
│   │   │   ├── chat.service.ts
│   │   │   ├── context.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── care/                # Care schedules & reminders
│   │   │   ├── care.module.ts
│   │   │   ├── care.controller.ts
│   │   │   ├── care.service.ts
│   │   │   └── dto/
│   │   │
│   │   └── subscriptions/       # Premium subscriptions
│   │       ├── subscriptions.module.ts
│   │       ├── subscriptions.controller.ts
│   │       ├── subscriptions.service.ts
│   │       └── dto/
│   │
│   ├── providers/               # External service providers
│   │   ├── ai/                  # AI provider abstractions
│   │   │   ├── ai.module.ts
│   │   │   ├── ai-router.service.ts
│   │   │   ├── plant-id.provider.ts
│   │   │   ├── claude.provider.ts
│   │   │   ├── openai.provider.ts
│   │   │   ├── gemini.provider.ts
│   │   │   └── embeddings.provider.ts
│   │   │
│   │   ├── storage/             # File storage (Supabase)
│   │   │   ├── storage.module.ts
│   │   │   └── storage.service.ts
│   │   │
│   │   └── notifications/       # Push notifications
│   │       ├── notifications.module.ts
│   │       └── notifications.service.ts
│   │
│   └── database/                # Database module
│       ├── database.module.ts
│       └── prisma.service.ts
│
├── test/                        # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docker/                      # Docker configuration
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── vercel.json                  # Vercel configuration
├── nest-cli.json                # NestJS CLI configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies
└── .env.example                 # Environment variables template
```

---

## Critical Development Rules

### 1. Serverless Constraints

NestJS on Vercel has specific requirements:

```typescript
// ❌ NEVER do this - module-level side effects
const db = new PrismaClient(); // Created on module load

// ✅ ALWAYS do this - lazy initialization
@Injectable()
export class PrismaService implements OnModuleInit {
  private _client: PrismaClient;
  
  get client() {
    if (!this._client) {
      this._client = new PrismaClient();
    }
    return this._client;
  }
}
```

### 2. Cold Start Optimization

```typescript
// ❌ AVOID heavy imports at module level
import { everything } from 'massive-library';

// ✅ USE dynamic imports for heavy dependencies
async loadHeavyDependency() {
  const { HeavyClass } = await import('massive-library');
  return new HeavyClass();
}
```

### 3. Database Connection Pooling

```typescript
// Always use connection pooling for serverless
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // For migrations
}
```

### 4. AI Provider Fallbacks

Every AI call MUST have a fallback:

```typescript
// ✅ CORRECT - Always implement fallback
async identifyPlant(image: string): Promise<IdentificationResult> {
  try {
    return await this.plantIdProvider.identify(image);
  } catch (error) {
    this.logger.warn('Plant.id failed, falling back to Gemini', error);
    return await this.geminiProvider.identifyPlant(image);
  }
}
```

### 5. Environment Variables

Required environment variables (see `.env.example`):

```bash
# Database
DATABASE_URL=               # Supabase connection string (pooled)
DIRECT_URL=                 # Direct connection for migrations

# AI Providers
PLANT_ID_API_KEY=          # Plant.id API key
ANTHROPIC_API_KEY=         # Claude API key
OPENAI_API_KEY=            # OpenAI API key
GOOGLE_AI_API_KEY=         # Gemini API key

# Supabase
SUPABASE_URL=              # Supabase project URL
SUPABASE_ANON_KEY=         # Supabase anonymous key
SUPABASE_SERVICE_KEY=      # Supabase service role key

# Auth
JWT_SECRET=                # JWT signing secret
JWT_EXPIRATION=            # Token expiration time

# App
NODE_ENV=                  # development | production
LOG_LEVEL=                 # debug | info | warn | error
```

---

## Module Development Pattern

When creating a new module, follow this exact pattern:

### 1. Create Module Structure

```bash
src/modules/[feature]/
├── [feature].module.ts      # Module definition
├── [feature].controller.ts  # HTTP endpoints
├── [feature].service.ts     # Business logic
├── [feature].repository.ts  # Data access (optional)
├── dto/
│   ├── create-[feature].dto.ts
│   ├── update-[feature].dto.ts
│   └── [feature]-response.dto.ts
└── entities/
    └── [feature].entity.ts  # Type definitions
```

### 2. Module Template

```typescript
// [feature].module.ts
import { Module } from '@nestjs/common';
import { FeatureController } from './feature.controller';
import { FeatureService } from './feature.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
```

### 3. Controller Template

```typescript
// [feature].controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FeatureService } from './feature.service';
import { CreateFeatureDto } from './dto/create-feature.dto';

@ApiTags('feature')
@Controller('feature')
@UseGuards(JwtAuthGuard)
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Post()
  @ApiOperation({ summary: 'Create feature' })
  @ApiResponse({ status: HttpStatus.CREATED })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFeatureDto,
  ) {
    return this.featureService.create(userId, dto);
  }
}
```

### 4. Service Template

```typescript
// [feature].service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFeatureDto } from './dto/create-feature.dto';

@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeatureDto) {
    this.logger.debug(`Creating feature for user ${userId}`);
    
    return this.prisma.client.feature.create({
      data: {
        ...dto,
        userId,
      },
    });
  }
}
```

---

## AI Integration Pattern

When calling AI providers, always follow this pattern:

```typescript
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly aiRouter: AIRouterService,
    private readonly contextService: ContextService,
  ) {}

  async chat(userId: string, message: string, plantId?: string) {
    // 1. Build context (parallel retrieval)
    const context = await this.contextService.buildContext(
      userId,
      message,
      plantId,
    );

    // 2. Determine model tier
    const modelTier = this.determineModelTier(message, context);

    // 3. Call AI with fallback
    const response = await this.aiRouter.chat({
      model: modelTier,
      context,
      message,
      fallbackModel: 'gpt-4o-mini',
    });

    // 4. Post-process and store
    await this.storeConversation(userId, message, response);

    return response;
  }

  private determineModelTier(message: string, context: Context): ModelTier {
    // Complex queries get upgraded to Sonnet
    if (this.isComplexQuery(message, context)) {
      return 'claude-sonnet-4-5';
    }
    return 'claude-haiku-3-5';
  }
}
```

---

## Testing Requirements

### Unit Tests

Every service method must have unit tests:

```typescript
// feature.service.spec.ts
describe('FeatureService', () => {
  let service: FeatureService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FeatureService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get(FeatureService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a feature', async () => {
      // Arrange
      const dto = { name: 'test' };
      prisma.feature.create.mockResolvedValue({ id: '1', ...dto });

      // Act
      const result = await service.create('user-1', dto);

      // Assert
      expect(result.id).toBe('1');
      expect(prisma.feature.create).toHaveBeenCalledWith({
        data: { ...dto, userId: 'user-1' },
      });
    });
  });
});
```

### Integration Tests

AI integrations must have integration tests with mocked providers:

```typescript
// chat.integration.spec.ts
describe('ChatService Integration', () => {
  it('should fallback to GPT when Claude fails', async () => {
    // Mock Claude to fail
    claudeProvider.chat.mockRejectedValue(new Error('Rate limited'));
    
    // GPT should be called as fallback
    const result = await chatService.chat('user-1', 'Help my plant');
    
    expect(openaiProvider.chat).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
```

---

## Error Handling

Use standardized error responses:

```typescript
// common/filters/http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: this.getErrorCode(exception),
        message: this.getMessage(exception),
        timestamp: new Date().toISOString(),
        path: ctx.getRequest().url,
      },
    };

    response.status(status).json(errorResponse);
  }
}
```

---

## Commit Message Format

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(chat): add streaming response support
fix(identification): handle Plant.id timeout gracefully
docs(api): update OpenAPI specifications
refactor(ai): extract provider abstraction layer
```

---

## Pre-Commit Checklist

Before committing any code:

- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Types check (`pnpm typecheck`)
- [ ] API documentation updated if endpoints changed
- [ ] Environment variables documented if added
- [ ] Database migrations created if schema changed
- [ ] Error handling includes fallbacks for AI calls

---

## Getting Help

1. **Architecture questions**: Read `.claude/docs/ARCHITECTURE.md`
2. **API contracts**: Read `.claude/docs/API_SPEC.md`
3. **Database schema**: Read `.claude/docs/DATABASE.md`
4. **AI integration**: Read `.claude/docs/AI_INTEGRATION.md`
5. **Code style**: Read `.claude/docs/CODING_STANDARDS.md`

---

*Last Updated: December 2025*
