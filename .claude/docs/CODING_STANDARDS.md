# LeafWise API - Coding Standards

> **Reference Document for AI Agents**
> Follow these standards when writing or modifying code.

## Table of Contents

1. [General Principles](#general-principles)
2. [TypeScript Standards](#typescript-standards)
3. [NestJS Patterns](#nestjs-patterns)
4. [Naming Conventions](#naming-conventions)
5. [File Organization](#file-organization)
6. [Error Handling](#error-handling)
7. [Testing Standards](#testing-standards)
8. [Documentation](#documentation)
9. [Git Workflow](#git-workflow)

---

## General Principles

### Core Values

1. **Readability over cleverness** - Code is read more than written
2. **Explicit over implicit** - Be clear about intentions
3. **Fail fast, fail loud** - Errors should be obvious
4. **Single responsibility** - Each function/class does one thing well
5. **Immutability by default** - Prefer `const`, avoid mutations

### Code Quality Checklist

Before committing any code:

- [ ] Types are explicit (no `any` unless absolutely necessary)
- [ ] Functions are under 30 lines
- [ ] No commented-out code
- [ ] No console.log (use Logger)
- [ ] Error handling is comprehensive
- [ ] Unit tests cover new functionality
- [ ] No sensitive data in code

---

## TypeScript Standards

### Type Definitions

```typescript
// ✅ GOOD - Explicit types
interface CreatePlantDto {
  speciesId: string;
  nickname?: string;
  locationInHome: string;
  lightExposure: LightExposure;
}

// ❌ BAD - Implicit any
function processPlant(data) {
  return data.name;
}

// ✅ GOOD - Explicit return type
function processPlant(data: PlantData): ProcessedPlant {
  return {
    name: data.name,
    processed: true,
  };
}
```

### Avoid `any`

```typescript
// ❌ BAD
function handleResponse(data: any): any {
  return data.result;
}

// ✅ GOOD - Use generics or specific types
function handleResponse<T>(data: ApiResponse<T>): T {
  return data.result;
}

// ✅ GOOD - Use unknown for truly unknown data
function parseExternalData(data: unknown): ParsedData {
  if (isValidData(data)) {
    return data as ParsedData;
  }
  throw new Error('Invalid data format');
}
```

### Enums vs Union Types

```typescript
// ✅ PREFERRED - Union types for simple cases
type PlantHealth = 'thriving' | 'healthy' | 'struggling' | 'critical';

// ✅ OK - Enums for complex cases or when values need to be iterated
enum CareAction {
  WATERED = 'watered',
  FERTILIZED = 'fertilized',
  REPOTTED = 'repotted',
  PRUNED = 'pruned',
}
```

### Null Handling

```typescript
// ❌ BAD - Unchecked null access
function getPlantName(plant: Plant | null): string {
  return plant.nickname; // Might crash!
}

// ✅ GOOD - Explicit null handling
function getPlantName(plant: Plant | null): string {
  return plant?.nickname ?? plant?.species.commonName ?? 'Unknown Plant';
}

// ✅ GOOD - Early return pattern
function processPlant(plant: Plant | null): ProcessedPlant {
  if (!plant) {
    throw new NotFoundException('Plant not found');
  }
  
  // TypeScript now knows plant is not null
  return {
    id: plant.id,
    name: plant.nickname,
  };
}
```

### Async/Await

```typescript
// ❌ BAD - Mixing promises and async/await
async function getData() {
  return fetch(url).then(r => r.json());
}

// ✅ GOOD - Consistent async/await
async function getData(): Promise<Data> {
  const response = await fetch(url);
  return response.json();
}

// ✅ GOOD - Parallel execution when possible
async function getPlantWithDetails(plantId: string): Promise<PlantDetails> {
  const [plant, careHistory, healthIssues] = await Promise.all([
    this.plantsRepository.findById(plantId),
    this.careRepository.findByPlantId(plantId),
    this.healthRepository.findActiveByPlantId(plantId),
  ]);
  
  return { plant, careHistory, healthIssues };
}
```

---

## NestJS Patterns

### Module Structure

```typescript
// feature.module.ts
@Module({
  imports: [
    DatabaseModule,
    // Only import what's needed
  ],
  controllers: [FeatureController],
  providers: [
    FeatureService,
    FeatureRepository, // If using repository pattern
  ],
  exports: [FeatureService], // Only export what other modules need
})
export class FeatureModule {}
```

### Controller Pattern

```typescript
// feature.controller.ts
@ApiTags('feature')
@Controller('feature')
@UseGuards(JwtAuthGuard)
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get()
  @ApiOperation({ summary: 'List all features' })
  @ApiResponse({ status: 200, type: [FeatureResponseDto] })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: ListFeaturesQueryDto,
  ): Promise<PaginatedResponse<FeatureResponseDto>> {
    return this.featureService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feature by ID' })
  @ApiResponse({ status: 200, type: FeatureResponseDto })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FeatureResponseDto> {
    return this.featureService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create feature' })
  @ApiResponse({ status: 201, type: FeatureResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFeatureDto,
  ): Promise<FeatureResponseDto> {
    return this.featureService.create(userId, dto);
  }
}
```

### Service Pattern

```typescript
// feature.service.ts
@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    userId: string,
    query: ListFeaturesQueryDto,
  ): Promise<PaginatedResponse<Feature>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    
    const [items, total] = await Promise.all([
      this.prisma.client.feature.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.client.feature.count({ where: { userId } }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string): Promise<Feature> {
    const feature = await this.prisma.client.feature.findFirst({
      where: { id, userId },
    });

    if (!feature) {
      throw new NotFoundException(`Feature with ID ${id} not found`);
    }

    return feature;
  }

  async create(userId: string, dto: CreateFeatureDto): Promise<Feature> {
    this.logger.debug(`Creating feature for user ${userId}`);

    const feature = await this.prisma.client.feature.create({
      data: {
        ...dto,
        userId,
      },
    });

    // Emit event for side effects
    this.eventEmitter.emit('feature.created', { userId, featureId: feature.id });

    return feature;
  }
}
```

### DTO Validation

```typescript
// dto/create-feature.dto.ts
import { IsString, IsOptional, IsEnum, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeatureDto {
  @ApiProperty({
    description: 'Species ID from identification or manual selection',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  speciesId: string;

  @ApiPropertyOptional({
    description: 'Custom nickname for the plant',
    example: 'My Pothos',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @ApiProperty({
    description: 'Location of the plant in home',
    example: 'Living room, east window',
  })
  @IsString()
  @MaxLength(200)
  locationInHome: string;

  @ApiProperty({
    description: 'Light exposure level',
    enum: ['low', 'medium', 'bright', 'direct'],
  })
  @IsEnum(['low', 'medium', 'bright', 'direct'])
  lightExposure: 'low' | 'medium' | 'bright' | 'direct';
}
```

### Custom Decorators

```typescript
// common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

// Usage
@Get('profile')
async getProfile(@CurrentUser('id') userId: string) {
  return this.usersService.findById(userId);
}
```

### Guards

```typescript
// common/guards/subscription.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PaymentRequiredException } from '../exceptions/payment-required.exception';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTier = this.reflector.get<string>('subscription', context.getHandler());
    
    if (!requiredTier) {
      return true; // No subscription requirement
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;

    const hasAccess = await this.subscriptionService.checkAccess(userId, requiredTier);
    
    if (!hasAccess) {
      throw new PaymentRequiredException(
        'This feature requires a premium subscription',
      );
    }

    return true;
  }
}

// Usage with decorator
@RequiresSubscription('premium')
@Get('premium-feature')
async getPremiumFeature() {
  // Only accessible to premium users
}
```

### Interceptors

```typescript
// common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Handle pagination responses
        if (data && 'data' in data && 'meta' in data) {
          return {
            success: true,
            data: data.data,
            meta: data.meta,
          };
        }
        
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
```

---

## Naming Conventions

### Files

```
feature.module.ts        # Module definition
feature.controller.ts    # HTTP layer
feature.service.ts       # Business logic
feature.repository.ts    # Data access (optional)
feature.entity.ts        # Type definitions
feature.constants.ts     # Constants

dto/
  create-feature.dto.ts  # Input validation
  update-feature.dto.ts
  feature-response.dto.ts # Response transformation
  feature-query.dto.ts    # Query parameters
```

### Classes and Interfaces

```typescript
// Classes - PascalCase with suffix
class PlantsController {}
class PlantsService {}
class PlantIdProvider {}

// Interfaces - PascalCase, no 'I' prefix
interface Plant {}
interface CreatePlantDto {}
interface PlantRepository {}

// Types - PascalCase
type PlantHealth = 'thriving' | 'healthy' | 'struggling' | 'critical';
type CareAction = 'watered' | 'fertilized' | 'repotted';
```

### Variables and Functions

```typescript
// Variables - camelCase
const plantId = '123';
const userPlants = [];
const isHealthy = true;

// Functions - camelCase, verb prefix
function getPlantById(id: string) {}
function createPlant(dto: CreatePlantDto) {}
function validatePlantData(data: unknown) {}
async function fetchPlantDetails(id: string) {}

// Boolean variables - is/has/should prefix
const isActive = true;
const hasPermission = false;
const shouldRefresh = true;
```

### Constants

```typescript
// Constants - SCREAMING_SNAKE_CASE
const MAX_PLANTS_FREE_TIER = 3;
const DEFAULT_PAGE_SIZE = 20;
const AI_TIMEOUT_MS = 30000;

// Configuration objects - camelCase
const databaseConfig = {
  host: 'localhost',
  port: 5432,
};
```

---

## File Organization

### Import Order

```typescript
// 1. Node.js built-ins
import { readFile } from 'fs/promises';
import * as path from 'path';

// 2. External packages
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// 3. Internal modules (absolute paths)
import { PrismaService } from '@/database/prisma.service';
import { AIRouterService } from '@/providers/ai/ai-router.service';

// 4. Relative imports
import { CreatePlantDto } from './dto/create-plant.dto';
import { Plant } from './entities/plant.entity';
```

### Module File Structure

```
src/modules/plants/
├── plants.module.ts           # Module definition (first)
├── plants.controller.ts       # HTTP layer
├── plants.service.ts          # Business logic
├── plants.repository.ts       # Data access
├── dto/
│   ├── index.ts               # Barrel export
│   ├── create-plant.dto.ts
│   ├── update-plant.dto.ts
│   └── plant-response.dto.ts
├── entities/
│   ├── index.ts
│   └── plant.entity.ts
├── guards/
│   └── plant-owner.guard.ts
├── interceptors/
│   └── plant-cache.interceptor.ts
└── __tests__/
    ├── plants.controller.spec.ts
    ├── plants.service.spec.ts
    └── plants.e2e-spec.ts
```

---

## Error Handling

### Custom Exceptions

```typescript
// common/exceptions/index.ts
export class AppException extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppException';
  }
}

export class PaymentRequiredException extends AppException {
  constructor(message: string = 'Payment required', details?: unknown) {
    super('PAYMENT_REQUIRED', message, 402, details);
  }
}

export class LimitExceededException extends AppException {
  constructor(feature: string, used: number, limit: number) {
    super(
      'LIMIT_EXCEEDED',
      `You have reached your limit of ${limit} ${feature}`,
      402,
      { feature, used, limit },
    );
  }
}

export class AIProviderException extends AppException {
  constructor(provider: string, originalError?: Error) {
    super(
      'AI_PROVIDER_ERROR',
      `AI service temporarily unavailable`,
      503,
      { provider, originalMessage: originalError?.message },
    );
  }
}
```

### Exception Filter

```typescript
// common/filters/all-exceptions.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.buildErrorResponse(exception, request);

    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(body);
  }

  private buildErrorResponse(exception: unknown, request: Request) {
    // Handle known exceptions
    if (exception instanceof AppException) {
      return {
        status: exception.statusCode,
        body: {
          success: false,
          error: {
            code: exception.code,
            message: exception.message,
            details: exception.details,
            timestamp: new Date().toISOString(),
            path: request.url,
          },
        },
      };
    }

    // Handle NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      
      return {
        status,
        body: {
          success: false,
          error: {
            code: this.getErrorCode(status),
            message: typeof response === 'string' 
              ? response 
              : (response as any).message,
            timestamp: new Date().toISOString(),
            path: request.url,
          },
        },
      };
    }

    // Handle unknown errors
    return {
      status: 500,
      body: {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      },
    };
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_EXCEEDED',
    };
    return codes[status] || 'INTERNAL_ERROR';
  }
}
```

### Service Error Handling

```typescript
// ✅ GOOD - Comprehensive error handling
@Injectable()
export class PlantsService {
  async create(userId: string, dto: CreatePlantDto): Promise<Plant> {
    // 1. Validate business rules
    const plantCount = await this.prisma.client.plant.count({
      where: { userId },
    });
    
    const user = await this.usersService.findById(userId);
    const limit = user.subscriptionTier === 'free' ? 3 : Infinity;
    
    if (plantCount >= limit) {
      throw new LimitExceededException('plants', plantCount, limit);
    }

    // 2. Verify related entities exist
    const species = await this.prisma.client.species.findUnique({
      where: { id: dto.speciesId },
    });
    
    if (!species) {
      throw new NotFoundException(`Species with ID ${dto.speciesId} not found`);
    }

    // 3. Create with transaction
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const plant = await tx.plant.create({
          data: { ...dto, userId },
        });
        
        await tx.reminder.create({
          data: this.createDefaultReminder(plant),
        });
        
        return plant;
      });
    } catch (error) {
      this.logger.error('Failed to create plant', error);
      throw new AppException(
        'PLANT_CREATE_FAILED',
        'Failed to create plant',
        500,
      );
    }
  }
}
```

---

## Testing Standards

### Unit Test Structure

```typescript
// plants.service.spec.ts
describe('PlantsService', () => {
  let service: PlantsService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PlantsService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaClient>(),
        },
      ],
    }).compile();

    service = module.get(PlantsService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    const userId = 'user-123';
    const dto: CreatePlantDto = {
      speciesId: 'species-123',
      locationInHome: 'Living room',
      lightExposure: 'medium',
    };

    it('should create a plant successfully', async () => {
      // Arrange
      const expectedPlant = { id: 'plant-123', ...dto, userId };
      prisma.plant.count.mockResolvedValue(0);
      prisma.species.findUnique.mockResolvedValue({ id: dto.speciesId } as any);
      prisma.$transaction.mockImplementation((fn) => fn(prisma));
      prisma.plant.create.mockResolvedValue(expectedPlant as any);

      // Act
      const result = await service.create(userId, dto);

      // Assert
      expect(result).toEqual(expectedPlant);
      expect(prisma.plant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId, speciesId: dto.speciesId }),
      });
    });

    it('should throw LimitExceededException when free tier limit reached', async () => {
      // Arrange
      prisma.plant.count.mockResolvedValue(3);

      // Act & Assert
      await expect(service.create(userId, dto)).rejects.toThrow(
        LimitExceededException,
      );
    });

    it('should throw NotFoundException when species not found', async () => {
      // Arrange
      prisma.plant.count.mockResolvedValue(0);
      prisma.species.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

### Integration Test

```typescript
// plants.integration.spec.ts
describe('PlantsService Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database
    await prisma.client.$executeRaw`TRUNCATE plants CASCADE`;
  });

  it('should create and retrieve a plant', async () => {
    // Create
    const createResponse = await request(app.getHttpServer())
      .post('/plants')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        speciesId: testSpeciesId,
        locationInHome: 'Test Location',
        lightExposure: 'medium',
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    const plantId = createResponse.body.data.id;

    // Retrieve
    const getResponse = await request(app.getHttpServer())
      .get(`/plants/${plantId}`)
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);

    expect(getResponse.body.data.id).toBe(plantId);
  });
});
```

### Test Coverage Requirements

| Area | Minimum Coverage |
|------|------------------|
| Services | 80% |
| Controllers | 70% |
| Guards | 90% |
| Utils | 90% |
| Overall | 75% |

---

## Documentation

### JSDoc for Public APIs

```typescript
/**
 * Creates a new plant in the user's collection.
 *
 * @param userId - The ID of the user creating the plant
 * @param dto - The plant creation data
 * @returns The created plant with all default values populated
 * @throws {LimitExceededException} When user has reached their plant limit
 * @throws {NotFoundException} When the specified species doesn't exist
 *
 * @example
 * ```typescript
 * const plant = await plantsService.create('user-123', {
 *   speciesId: 'species-456',
 *   locationInHome: 'Living room',
 *   lightExposure: 'medium',
 * });
 * ```
 */
async create(userId: string, dto: CreatePlantDto): Promise<Plant> {
  // Implementation
}
```

### Swagger Documentation

```typescript
@ApiTags('plants')
@Controller('plants')
export class PlantsController {
  @Post()
  @ApiOperation({
    summary: 'Create a new plant',
    description: 'Adds a new plant to the user\'s collection with default care schedule',
  })
  @ApiBody({ type: CreatePlantDto })
  @ApiResponse({
    status: 201,
    description: 'Plant created successfully',
    type: PlantResponseDto,
  })
  @ApiResponse({
    status: 402,
    description: 'Free tier plant limit reached',
  })
  @ApiResponse({
    status: 404,
    description: 'Species not found',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePlantDto,
  ): Promise<PlantResponseDto> {
    return this.plantsService.create(userId, dto);
  }
}
```

---

## Git Workflow

### Branch Naming

```
feature/add-plant-health-tracking
fix/identification-timeout-handling
refactor/ai-provider-abstraction
docs/update-api-specification
chore/upgrade-dependencies
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, semicolons)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(plants): add batch plant creation endpoint

Allows users to add multiple plants at once from identification results.
Includes validation for duplicate species and limit checking.

Closes #123

---

fix(chat): handle Claude API timeout gracefully

- Add 30s timeout to Claude requests
- Implement automatic fallback to GPT-4o-mini
- Log timeout events for monitoring

---

refactor(ai): extract provider interface

BREAKING CHANGE: AI providers must now implement AIProvider interface
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally
```

---

## Linting & Formatting

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'error',
  },
};
```

### Prettier Configuration

```json
// .prettierrc
{
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100
}
```

---

*Last Updated: December 2025*
