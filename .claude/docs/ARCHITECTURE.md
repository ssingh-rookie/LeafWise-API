# LeafWise API - System Architecture

> **Reference Document for AI Agents**
> This document describes the system architecture. Read before making structural changes.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [High-Level Architecture](#high-level-architecture)
4. [Microservices Design](#microservices-design)
5. [Serverless Considerations](#serverless-considerations)
6. [Data Flow Patterns](#data-flow-patterns)
7. [AI Orchestration Layer](#ai-orchestration-layer)
8. [Security Architecture](#security-architecture)

---

## Overview

LeafWise API follows a **modular monolith** architecture deployed as **serverless functions** on Vercel. While structured as independent modules (potential microservices), they share a single deployment unit for operational simplicity.

### Architecture Style

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODULAR MONOLITH                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │   Auth   │ │  Plants  │ │   Chat   │ │  Health  │  ...      │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │            │            │            │                  │
│  ┌────┴────────────┴────────────┴────────────┴─────┐           │
│  │              Shared Infrastructure               │           │
│  │   (Database, AI Providers, Storage, Logging)     │           │
│  └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │   Vercel Serverless       │
              │   (Edge + Node.js)        │
              └───────────────────────────┘
```

---

## Architecture Principles

### 1. Domain-Driven Modules

Each module owns its domain and exposes a clean interface:

```typescript
// Good - Module encapsulates its domain
@Module({
  imports: [DatabaseModule, AIModule],
  controllers: [PlantsController],
  providers: [PlantsService, PlantsRepository],
  exports: [PlantsService], // Only export what's needed
})
export class PlantsModule {}
```

### 2. Dependency Inversion

Depend on abstractions, not implementations:

```typescript
// Define interface
export interface AIProvider {
  chat(message: string, context: Context): Promise<ChatResponse>;
}

// Inject by token
@Injectable()
export class ChatService {
  constructor(
    @Inject('AI_PROVIDER') private readonly aiProvider: AIProvider,
  ) {}
}

// Register implementation
{
  provide: 'AI_PROVIDER',
  useClass: ClaudeProvider,
}
```

### 3. Fail-Safe AI Operations

Every AI operation must have fallback:

```typescript
async identifyPlant(image: string): Promise<Result> {
  const providers = [
    () => this.plantId.identify(image),
    () => this.gemini.identifyPlant(image),
    () => this.fallbackIdentification(image),
  ];

  for (const provider of providers) {
    try {
      return await provider();
    } catch (error) {
      this.logger.warn(`Provider failed: ${error.message}`);
    }
  }
  
  throw new ServiceUnavailableException('All AI providers unavailable');
}
```

### 4. Event-Driven Side Effects

Use events for cross-module communication:

```typescript
// Emit event
this.eventEmitter.emit('plant.healthCheck.completed', {
  userId,
  plantId,
  issues: healthIssues,
});

// Listen in another module
@OnEvent('plant.healthCheck.completed')
async handleHealthCheck(payload: HealthCheckEvent) {
  await this.notificationService.sendHealthAlert(payload);
}
```

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MOBILE APP                                      │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│    │  Camera  │  │   Chat   │  │  Plants  │  │ Schedule │                   │
│    └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
└─────────┼─────────────┼─────────────┼─────────────┼─────────────────────────┘
          │             │             │             │
          ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VERCEL EDGE NETWORK                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        API Gateway Layer                             │    │
│  │   • Rate Limiting    • Authentication    • Request Validation       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
          │             │             │             │
          ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NESTJS SERVERLESS FUNCTIONS                          │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Auth     │  │   Plants    │  │    Chat     │  │   Health    │        │
│  │   Module    │  │   Module    │  │   Module    │  │   Module    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│  ┌──────┴────────────────┴────────────────┴────────────────┴──────┐        │
│  │                    SHARED SERVICES LAYER                        │        │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │        │
│  │  │   Database   │  │  AI Router   │  │   Storage    │          │        │
│  │  │   Service    │  │   Service    │  │   Service    │          │        │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │        │
│  └─────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐  ┌─────────────────────────┐  ┌──────────────────┐
│    Supabase     │  │     AI Providers        │  │    Supabase      │
│   PostgreSQL    │  │  ┌─────────────────┐    │  │     Storage      │
│   + pgvector    │  │  │    Plant.id     │    │  │                  │
│                 │  │  ├─────────────────┤    │  │   (Photos)       │
│   • Users       │  │  │     Claude      │    │  │                  │
│   • Plants      │  │  ├─────────────────┤    │  └──────────────────┘
│   • Sessions    │  │  │     OpenAI      │    │
│   • Embeddings  │  │  ├─────────────────┤    │
│                 │  │  │     Gemini      │    │
└─────────────────┘  │  └─────────────────┘    │
                     └─────────────────────────┘
```

---

## Microservices Design

### Module Boundaries

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| **Auth** | Authentication, JWT tokens, sessions | Database |
| **Users** | User profiles, preferences | Database |
| **Plants** | Plant collection CRUD | Database, Storage |
| **Identification** | Plant ID via AI | AI Providers, Plants |
| **Health** | Health diagnosis | AI Providers, Plants |
| **Chat** | Conversational AI | AI Providers, Context |
| **Care** | Reminders, schedules | Plants, Notifications |
| **Subscriptions** | Premium features, limits | Users, Database |

### Module Communication

```
┌──────────────────────────────────────────────────────────────┐
│                    MODULE INTERACTION MAP                     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────┐                                                     │
│  │ Auth │◄────────────────────────────────────────┐          │
│  └──┬───┘                                         │          │
│     │ validates                                    │          │
│     ▼                                             │          │
│  ┌──────┐    owns     ┌────────┐   diagnoses   ┌──────┐     │
│  │Users │◄───────────►│ Plants │◄─────────────►│Health│     │
│  └──┬───┘             └───┬────┘               └──┬───┘     │
│     │                     │                       │          │
│     │ subscribes          │ identified by         │ AI       │
│     ▼                     ▼                       ▼          │
│  ┌─────────────┐    ┌────────────┐         ┌─────────┐      │
│  │Subscriptions│    │Identification│        │   AI    │      │
│  └─────────────┘    └────────────┘         │ Router  │      │
│                                             └────┬────┘      │
│                           ┌──────────────────────┤           │
│                           │                      │           │
│                           ▼                      ▼           │
│                      ┌────────┐            ┌─────────┐       │
│                      │  Chat  │            │  Care   │       │
│                      └────────┘            └─────────┘       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Inter-Module Communication Patterns

**Direct Service Injection** (same deployment):
```typescript
@Module({
  imports: [PlantsModule],
  providers: [HealthService],
})
export class HealthModule {}

@Injectable()
export class HealthService {
  constructor(private readonly plantsService: PlantsService) {}
}
```

**Event Emission** (decoupled side effects):
```typescript
// In Health Module
await this.eventEmitter.emit('health.issue.detected', {
  plantId,
  severity: 'high',
});

// In Care Module
@OnEvent('health.issue.detected')
async createUrgentReminder(event: HealthIssueEvent) {
  // Create care reminder
}
```

---

## Serverless Considerations

### Cold Start Optimization

NestJS has inherent cold start overhead. Mitigate with:

**1. Lazy Module Loading**
```typescript
// vercel.json - Split into multiple functions
{
  "functions": {
    "api/identify.ts": { "maxDuration": 30 },
    "api/chat.ts": { "maxDuration": 60 },
    "api/health.ts": { "maxDuration": 30 }
  }
}
```

**2. Minimal Bootstrap**
```typescript
// Each function only loads required modules
// api/identify.ts
const app = await NestFactory.create(IdentificationModule, {
  logger: ['error', 'warn'],
});
```

**3. Connection Pooling**
```typescript
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")       // Pooled connection
  directUrl = env("DIRECT_URL")         // Direct (for migrations)
}
```

**4. Keep-Alive for AI Connections**
```typescript
// Reuse HTTP agents across invocations
const agent = new https.Agent({ keepAlive: true });
```

### Function Configuration

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/main.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "dist/main.js" }
  ],
  "functions": {
    "dist/main.js": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

### Timeout Strategy

| Endpoint | Max Duration | Strategy |
|----------|--------------|----------|
| `/api/identify` | 10s | Fast Plant.id, Gemini fallback |
| `/api/health` | 15s | Multi-provider analysis |
| `/api/chat` | 30s | Streaming response |
| `/api/chat/stream` | 60s | SSE streaming |

---

## Data Flow Patterns

### Plant Identification Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────────┐
│  User   │────►│ /api/identify│────►│ Identification  │
│  Photo  │     │  Controller  │     │    Service      │
└─────────┘     └─────────────┘     └────────┬────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
            │   Plant.id    │        │    Gemini     │        │   Fallback    │
            │   Provider    │        │   Provider    │        │   Handler     │
            └───────┬───────┘        └───────┬───────┘        └───────────────┘
                    │ Success                │ On Failure
                    ▼                        │
            ┌───────────────┐               │
            │   Normalize   │◄──────────────┘
            │   Response    │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐     ┌───────────────┐
            │    Plants     │────►│   Supabase    │
            │   Service     │     │   Storage     │
            └───────┬───────┘     └───────────────┘
                    │
                    ▼
            ┌───────────────┐
            │   Response    │
            │   to User     │
            └───────────────┘
```

### Chat Context Building Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CONTEXT BUILDING PIPELINE                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   User Message: "Why are my pothos leaves turning yellow?"                │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                    PARALLEL RETRIEVAL                            │    │
│   │                                                                  │    │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │    │
│   │  │ User Profile │  │ Plant Data   │  │ Conversation │          │    │
│   │  │   Query      │  │   Query      │  │   History    │          │    │
│   │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │    │
│   │         │                 │                 │                   │    │
│   │         ▼                 ▼                 ▼                   │    │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │    │
│   │  │ - Name       │  │ - Species    │  │ - Last 5     │          │    │
│   │  │ - Experience │  │ - Care logs  │  │   messages   │          │    │
│   │  │ - Location   │  │ - Issues     │  │ - Summary    │          │    │
│   │  └──────────────┘  └──────────────┘  └──────────────┘          │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                      │
│                                    ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                    SEMANTIC SEARCH (RAG)                         │    │
│   │                                                                  │    │
│   │  Query: "pothos yellow leaves"                                   │    │
│   │                                                                  │    │
│   │  ┌──────────────────────────────────────────────────────────┐   │    │
│   │  │                  pgvector Similarity Search               │   │    │
│   │  │  • Past diagnosis: "Pothos overwatering - yellow leaves"  │   │    │
│   │  │  • Past advice: "Reduce watering frequency..."            │   │    │
│   │  └──────────────────────────────────────────────────────────┘   │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                      │
│                                    ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                    CONTEXT ASSEMBLY                              │    │
│   │                                                                  │    │
│   │  {                                                               │    │
│   │    "user": { "name": "Sarah", "level": "beginner" },            │    │
│   │    "plant": { "species": "Pothos", "lastWatered": "2 days" },   │    │
│   │    "history": [...],                                             │    │
│   │    "relevantMemories": [...],                                    │    │
│   │    "tokenCount": 1847                                            │    │
│   │  }                                                               │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                      │
│                                    ▼                                      │
│                           ┌──────────────┐                               │
│                           │  AI Router   │                               │
│                           │  (Claude)    │                               │
│                           └──────────────┘                               │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## AI Orchestration Layer

### Router Architecture

```typescript
// AI Router Service - Central orchestration
@Injectable()
export class AIRouterService {
  private readonly providers: Map<string, AIProvider>;

  constructor(
    private readonly plantId: PlantIdProvider,
    private readonly claude: ClaudeProvider,
    private readonly openai: OpenAIProvider,
    private readonly gemini: GeminiProvider,
  ) {
    this.providers = new Map([
      ['plant-id', plantId],
      ['claude-haiku-3-5', claude],
      ['claude-sonnet-4-5', claude],
      ['gpt-4o-mini', openai],
      ['gemini-flash', gemini],
    ]);
  }

  async route(request: AIRequest): Promise<AIResponse> {
    const provider = this.selectProvider(request);
    
    try {
      return await this.executeWithTimeout(provider, request);
    } catch (error) {
      return await this.handleFallback(request, error);
    }
  }
}
```

### Model Selection Matrix

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       AI MODEL SELECTION MATRIX                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Task Type              │ Primary         │ Fallback        │ Timeout    │
│  ───────────────────────┼─────────────────┼─────────────────┼─────────   │
│  Plant Identification   │ Plant.id        │ Gemini Flash    │ 10s        │
│  Health Assessment      │ Plant.id Health │ GPT-4o mini     │ 15s        │
│  Simple Chat            │ Claude Haiku    │ GPT-4o mini     │ 15s        │
│  Complex Analysis       │ Claude Sonnet   │ GPT-4o          │ 30s        │
│  Embeddings             │ text-embed-3-sm │ -               │ 5s         │
│  Symptom Reasoning      │ GPT-4o mini     │ Claude Haiku    │ 10s        │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Cost Control

```typescript
@Injectable()
export class CostControlService {
  async checkBudget(userId: string, action: AIAction): Promise<boolean> {
    const user = await this.getUser(userId);
    const limits = this.getLimits(user.subscriptionTier);
    const usage = await this.getUsage(userId, 'month');

    return usage[action] < limits[action];
  }

  async trackUsage(userId: string, action: AIAction, cost: number): Promise<void> {
    await this.prisma.usageLog.create({
      data: { userId, action, cost, timestamp: new Date() },
    });
  }
}
```

---

## Security Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐                │
│  │  Mobile  │────────►│  Supabase│────────►│  JWT     │                │
│  │   App    │  Login  │   Auth   │  Token  │  Issued  │                │
│  └──────────┘         └──────────┘         └────┬─────┘                │
│                                                  │                       │
│                                                  ▼                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      API REQUEST                                  │  │
│  │                                                                   │  │
│  │   Authorization: Bearer <jwt_token>                               │  │
│  │                                                                   │  │
│  └────────────────────────────────┬─────────────────────────────────┘  │
│                                   │                                     │
│                                   ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      JWT AUTH GUARD                               │  │
│  │                                                                   │  │
│  │   1. Extract token from header                                    │  │
│  │   2. Verify signature with Supabase public key                    │  │
│  │   3. Check expiration                                             │  │
│  │   4. Attach user to request                                       │  │
│  │                                                                   │  │
│  └────────────────────────────────┬─────────────────────────────────┘  │
│                                   │                                     │
│                                   ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      SUBSCRIPTION GUARD                           │  │
│  │                                                                   │  │
│  │   1. Check user subscription tier                                 │  │
│  │   2. Verify action is within limits                               │  │
│  │   3. Allow or return 402 Payment Required                         │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Security

| Data Type | At Rest | In Transit | Access Control |
|-----------|---------|------------|----------------|
| User PII | AES-256 (Supabase) | TLS 1.3 | Row-level security |
| Plant Photos | Encrypted storage | HTTPS | User-scoped URLs |
| API Keys | Env variables | N/A | Server-side only |
| Conversations | AES-256 | TLS 1.3 | User-scoped |
| Embeddings | PostgreSQL | TLS 1.3 | User-scoped |

### Row-Level Security (Supabase)

```sql
-- Users can only access their own plants
CREATE POLICY "Users can view own plants"
  ON plants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plants"
  ON plants FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT TOPOLOGY                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                          ┌──────────────┐                               │
│                          │   GitHub     │                               │
│                          │   Repo       │                               │
│                          └──────┬───────┘                               │
│                                 │ Push                                   │
│                                 ▼                                        │
│                          ┌──────────────┐                               │
│                          │   Vercel     │                               │
│                          │   Build      │                               │
│                          └──────┬───────┘                               │
│                                 │                                        │
│              ┌──────────────────┼──────────────────┐                    │
│              │                  │                  │                     │
│              ▼                  ▼                  ▼                     │
│       ┌───────────┐      ┌───────────┐      ┌───────────┐              │
│       │  Preview  │      │  Staging  │      │Production │              │
│       │   (PR)    │      │  (main)   │      │ (release) │              │
│       └─────┬─────┘      └─────┬─────┘      └─────┬─────┘              │
│             │                  │                  │                     │
│             ▼                  ▼                  ▼                     │
│       ┌───────────┐      ┌───────────┐      ┌───────────┐              │
│       │ Preview   │      │ Staging   │      │Production │              │
│       │ Supabase  │      │ Supabase  │      │ Supabase  │              │
│       └───────────┘      └───────────┘      └───────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Monitoring & Observability

### Logging Strategy

```typescript
// Structured logging for serverless
@Injectable()
export class LoggerService {
  log(level: LogLevel, message: string, context: LogContext) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
      requestId: this.requestId,
      userId: this.userId,
    }));
  }
}
```

### Key Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| API Latency (p95) | Vercel Analytics | > 3s |
| Error Rate | Vercel Logs | > 1% |
| AI Provider Failures | Custom logging | > 5% |
| Cold Start Duration | Vercel | > 2s |
| Database Connections | Supabase | > 80% pool |

---

## Scaling Considerations

### Current Limits (Vercel Hobby/Pro)

| Resource | Hobby | Pro |
|----------|-------|-----|
| Serverless Function Duration | 10s | 60s |
| Serverless Function Memory | 1024MB | 3008MB |
| Concurrent Executions | 10 | 1000 |
| Bandwidth | 100GB | 1TB |

### Future Migration Path

If scale exceeds Vercel limits:

1. **Short-term**: Upgrade to Vercel Enterprise
2. **Medium-term**: Split heavy functions (chat streaming) to dedicated infrastructure
3. **Long-term**: Kubernetes deployment with separate microservices

---

*Last Updated: December 2025*
