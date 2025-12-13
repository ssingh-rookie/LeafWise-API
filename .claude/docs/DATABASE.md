# LeafWise API - Database Design

> **Reference Document for AI Agents**
> This document defines the database schema, relationships, and data access patterns.

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Prisma Schema](#prisma-schema)
4. [Indexes & Performance](#indexes--performance)
5. [Data Access Patterns](#data-access-patterns)
6. [Migrations](#migrations)
7. [Seeding](#seeding)

---

## Overview

### Database Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | PostgreSQL 16 | Primary data store |
| Vector Extension | pgvector | Semantic embeddings for RAG |
| ORM | Prisma 5.x | Type-safe database access |
| Connection Pool | Supabase Pooler | Serverless connection management |

### Connection Configuration

```bash
# .env
# Pooled connection for application queries (serverless-safe)
DATABASE_URL="postgresql://user:pass@db.supabase.co:6543/postgres?pgbouncer=true"

# Direct connection for migrations (bypasses pooler)
DIRECT_URL="postgresql://user:pass@db.supabase.co:5432/postgres"
```

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY RELATIONSHIPS                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────┐         ┌──────────────┐         ┌──────────────┐                │
│  │   User   │────────<│    Plant     │────────<│  CareLog     │                │
│  │          │  1:N    │              │  1:N    │              │                │
│  └────┬─────┘         └──────┬───────┘         └──────────────┘                │
│       │                      │                                                  │
│       │ 1:N                  │ 1:N                                              │
│       │                      │                                                  │
│       ▼                      ▼                                                  │
│  ┌──────────────┐     ┌──────────────┐                                         │
│  │Conversation  │     │ HealthIssue  │                                         │
│  │   Session    │     │              │                                         │
│  └──────┬───────┘     └──────┬───────┘                                         │
│         │                    │                                                  │
│         │ 1:N                │ 1:N                                              │
│         │                    │                                                  │
│         ▼                    ▼                                                  │
│  ┌──────────────┐     ┌──────────────┐                                         │
│  │   Message    │     │  Treatment   │                                         │
│  │              │     │    Step      │                                         │
│  └──────────────┘     └──────────────┘                                         │
│                                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                    │
│  │   Species    │     │  PlantPhoto  │     │  Reminder    │                    │
│  │  (Reference) │     │              │     │              │                    │
│  └──────────────┘     └──────────────┘     └──────────────┘                    │
│                                                                                  │
│  ┌──────────────┐     ┌──────────────┐                                         │
│  │  Semantic    │     │  UsageLog    │                                         │
│  │   Memory     │     │              │                                         │
│  │  (Vectors)   │     │              │                                         │
│  └──────────────┘     └──────────────┘                                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [pgvector(map: "vector")]
}

// ============================================================================
// ENUMS
// ============================================================================

enum ExperienceLevel {
  beginner
  intermediate
  advanced
}

enum HomeType {
  apartment
  house
  office
}

enum LightCondition {
  low
  medium
  bright
  direct
}

enum HumidityLevel {
  low
  medium
  high
}

enum SubscriptionTier {
  free
  premium
}

enum AcquisitionMethod {
  purchased
  propagated
  gifted
  unknown
}

enum PlantHealth {
  thriving
  healthy
  struggling
  critical
}

enum IssueType {
  disease
  pest
  nutrient
  environmental
  unknown
}

enum IssueStatus {
  active
  treating
  resolved
  recurring
}

enum CareAction {
  watered
  fertilized
  repotted
  pruned
  treated
  custom
}

enum ReminderPriority {
  low
  medium
  high
}

enum ContentType {
  conversation
  diagnosis
  advice
  outcome
}

enum TipsFrequency {
  daily
  weekly
  none
}

// ============================================================================
// USER & AUTH
// ============================================================================

model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Profile
  experienceLevel ExperienceLevel @default(beginner) @map("experience_level")

  // Location
  city       String?
  climateZone String? @map("climate_zone")
  hemisphere  String? // 'northern' | 'southern'

  // Home Environment
  homeType       HomeType?       @map("home_type")
  lightConditions LightCondition? @map("light_conditions")
  humidityLevel   HumidityLevel?  @map("humidity_level")

  // Notification Preferences
  wateringReminders Boolean @default(true) @map("watering_reminders")
  healthAlerts      Boolean @default(true) @map("health_alerts")
  tipsFrequency     TipsFrequency @default(weekly) @map("tips_frequency")

  // Subscription
  subscriptionTier    SubscriptionTier @default(free) @map("subscription_tier")
  subscriptionExpires DateTime?        @map("subscription_expires")
  stripeCustomerId    String?          @unique @map("stripe_customer_id")

  // Relations
  plants              Plant[]
  conversationSessions ConversationSession[]
  semanticMemories    SemanticMemory[]
  usageLogs           UsageLog[]
  reminders           Reminder[]

  @@map("users")
}

// ============================================================================
// PLANTS
// ============================================================================

model Species {
  id             String @id @default(uuid()) @db.Uuid
  scientificName String @unique @map("scientific_name")
  commonNames    String[] @map("common_names")
  family         String
  genus          String

  // Care Requirements
  lightRequirement String @map("light_requirement")
  waterFrequency   String @map("water_frequency")
  humidityLevel    String @map("humidity_level")
  temperature      String
  toxicity         String?
  difficulty       String // 'easy' | 'moderate' | 'difficult'

  // Additional Info
  description        String?
  propagationMethods String[] @map("propagation_methods")
  commonIssues       String[] @map("common_issues")

  // Metadata
  plantIdSpeciesId String? @map("plant_id_species_id") // External ID from Plant.id
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  // Relations
  plants Plant[]

  @@map("species")
}

model Plant {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  speciesId String   @map("species_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Identification
  nickname String?

  // Acquisition
  acquiredDate      DateTime?         @map("acquired_date")
  acquisitionMethod AcquisitionMethod @default(unknown) @map("acquisition_method")

  // Location
  locationInHome String         @map("location_in_home")
  lightExposure  LightCondition @map("light_exposure")

  // Care Schedule
  wateringFrequencyDays    Int       @default(7) @map("watering_frequency_days")
  lastWatered              DateTime? @map("last_watered")
  nextWaterDue             DateTime? @map("next_water_due")
  fertilizingFrequencyWeeks Int      @default(4) @map("fertilizing_frequency_weeks")
  lastFertilized           DateTime? @map("last_fertilized")
  lastRepotted             DateTime? @map("last_repotted")

  // Health Status
  currentHealth PlantHealth @default(healthy) @map("current_health")

  // Relations
  user                 User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  species              Species               @relation(fields: [speciesId], references: [id])
  healthIssues         HealthIssue[]
  careLogs             CareLog[]
  photos               PlantPhoto[]
  conversationSessions ConversationSession[]
  reminders            Reminder[]

  @@index([userId])
  @@index([userId, currentHealth])
  @@index([userId, nextWaterDue])
  @@map("plants")
}

model PlantPhoto {
  id        String   @id @default(uuid()) @db.Uuid
  plantId   String   @map("plant_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  // Storage
  storageUrl String @map("storage_url")
  thumbnailUrl String? @map("thumbnail_url")

  // Metadata
  type     String // 'identification' | 'health' | 'progress'
  takenAt  DateTime @map("taken_at")
  fileSize Int      @map("file_size")

  // Relations
  plant Plant @relation(fields: [plantId], references: [id], onDelete: Cascade)

  @@index([plantId])
  @@index([plantId, type])
  @@map("plant_photos")
}

model CareLog {
  id        String   @id @default(uuid()) @db.Uuid
  plantId   String   @map("plant_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  // Care Details
  action      CareAction
  customAction String?    @map("custom_action") // If action is 'custom'
  performedAt DateTime    @map("performed_at")
  notes       String?

  // Relations
  plant Plant @relation(fields: [plantId], references: [id], onDelete: Cascade)

  @@index([plantId])
  @@index([plantId, performedAt])
  @@map("care_logs")
}

// ============================================================================
// HEALTH
// ============================================================================

model HealthIssue {
  id        String   @id @default(uuid()) @db.Uuid
  plantId   String   @map("plant_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Diagnosis
  issueType  IssueType @map("issue_type")
  diagnosis  String
  confidence Float     @default(0)
  symptoms   String[]

  // Treatment
  treatmentPlan String? @map("treatment_plan")
  cause         String?

  // Status
  status     IssueStatus @default(active)
  reportedAt DateTime    @map("reported_at")
  resolvedAt DateTime?   @map("resolved_at")

  // AI Interaction
  diagnosisSource String? @map("diagnosis_source") // 'ai_vision' | 'ai_chat' | 'user_reported'
  aiSessionId     String? @map("ai_session_id") @db.Uuid

  // Relations
  plant          Plant           @relation(fields: [plantId], references: [id], onDelete: Cascade)
  treatmentSteps TreatmentStep[]

  @@index([plantId])
  @@index([plantId, status])
  @@map("health_issues")
}

model TreatmentStep {
  id            String   @id @default(uuid()) @db.Uuid
  healthIssueId String   @map("health_issue_id") @db.Uuid
  createdAt     DateTime @default(now()) @map("created_at")

  // Step Details
  stepOrder   Int    @map("step_order")
  action      String
  details     String?
  timeline    String?
  priority    String // 'immediate' | 'soon' | 'monitor'

  // Completion
  completed   Boolean   @default(false)
  completedAt DateTime? @map("completed_at")

  // Relations
  healthIssue HealthIssue @relation(fields: [healthIssueId], references: [id], onDelete: Cascade)

  @@index([healthIssueId])
  @@map("treatment_steps")
}

// ============================================================================
// CONVERSATIONS
// ============================================================================

model ConversationSession {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  plantId   String?  @map("plant_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Session Info
  startedAt     DateTime @map("started_at")
  lastMessageAt DateTime @map("last_message_at")
  messageCount  Int      @default(0) @map("message_count")

  // AI Usage
  totalInputTokens  Int    @default(0) @map("total_input_tokens")
  totalOutputTokens Int    @default(0) @map("total_output_tokens")
  estimatedCost     Float  @default(0) @map("estimated_cost")
  modelsUsed        String[] @map("models_used")

  // Relations
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  plant    Plant?    @relation(fields: [plantId], references: [id], onDelete: SetNull)
  messages Message[]

  @@index([userId])
  @@index([userId, lastMessageAt])
  @@index([plantId])
  @@map("conversation_sessions")
}

model Message {
  id        String   @id @default(uuid()) @db.Uuid
  sessionId String   @map("session_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  // Content
  role    String // 'user' | 'assistant' | 'system'
  content String

  // For Assistant Messages
  modelUsed    String? @map("model_used")
  inputTokens  Int?    @map("input_tokens")
  outputTokens Int?    @map("output_tokens")

  // Extracted Info
  actionItems      Json? @map("action_items") // Array of action items
  plantsMentioned  String[] @map("plants_mentioned") @db.Uuid
  issuesIdentified String[] @map("issues_identified") @db.Uuid

  // Relations
  session ConversationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([sessionId, createdAt])
  @@map("messages")
}

// ============================================================================
// SEMANTIC MEMORY (RAG)
// ============================================================================

model SemanticMemory {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  // Content
  contentType ContentType @map("content_type")
  contentText String      @map("content_text")

  // Vector Embedding
  embedding Unsupported("vector(1536)")

  // References
  sourceSessionId String? @map("source_session_id") @db.Uuid
  sourcePlantId   String? @map("source_plant_id") @db.Uuid

  // Metadata
  relevanceScore Float @default(1.0) @map("relevance_score") // Decay over time

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("semantic_memories")
}

// ============================================================================
// REMINDERS
// ============================================================================

model Reminder {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  plantId   String   @map("plant_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Reminder Details
  action       CareAction
  customAction String?   @map("custom_action")
  dueDate      DateTime  @map("due_date")
  priority     ReminderPriority @default(medium)

  // Recurrence
  isRecurring         Boolean @default(false) @map("is_recurring")
  recurringFrequency  String? @map("recurring_frequency") // 'daily' | 'weekly' | 'monthly'
  recurringInterval   Int?    @map("recurring_interval")

  // Status
  completed   Boolean   @default(false)
  completedAt DateTime? @map("completed_at")
  skipped     Boolean   @default(false)
  skippedAt   DateTime? @map("skipped_at")

  // Relations
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  plant Plant @relation(fields: [plantId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, dueDate])
  @@index([userId, completed, dueDate])
  @@map("reminders")
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

model UsageLog {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  // Usage Details
  action    String // 'identification' | 'health_assessment' | 'chat' | 'embedding'
  provider  String // 'plant-id' | 'claude' | 'openai' | 'gemini'
  model     String?
  cost      Float  @default(0)

  // Token Tracking (for LLM calls)
  inputTokens  Int? @map("input_tokens")
  outputTokens Int? @map("output_tokens")

  // Request Context
  endpoint  String?
  latencyMs Int? @map("latency_ms")
  success   Boolean @default(true)
  errorCode String? @map("error_code")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, action, createdAt])
  @@index([createdAt])
  @@map("usage_logs")
}
```

---

## Indexes & Performance

### Index Strategy

```sql
-- Composite indexes for common queries
CREATE INDEX idx_plants_user_health ON plants(user_id, current_health);
CREATE INDEX idx_plants_user_water ON plants(user_id, next_water_due);
CREATE INDEX idx_reminders_user_due ON reminders(user_id, completed, due_date);

-- Full-text search on plant notes and care logs
CREATE INDEX idx_care_logs_notes ON care_logs USING gin(to_tsvector('english', notes));

-- Vector similarity search
CREATE INDEX idx_semantic_embedding ON semantic_memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### Vector Search Function

```sql
-- Create function for semantic search
CREATE OR REPLACE FUNCTION search_semantic_memory(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id,
    sm.content_type::TEXT,
    sm.content_text,
    1 - (sm.embedding <=> p_query_embedding) AS similarity
  FROM semantic_memories sm
  WHERE sm.user_id = p_user_id
  ORDER BY sm.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;
```

### Query Performance Guidelines

| Query Pattern | Expected Latency | Index Used |
|--------------|------------------|------------|
| Get user's plants | < 10ms | `idx_plants_user_id` |
| Filter by health | < 15ms | `idx_plants_user_health` |
| Upcoming reminders | < 10ms | `idx_reminders_user_due` |
| Semantic search (top 5) | < 50ms | `idx_semantic_embedding` |
| Full conversation history | < 20ms | `idx_messages_session` |

---

## Data Access Patterns

### Repository Pattern

```typescript
// src/modules/plants/plants.repository.ts
@Injectable()
export class PlantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string, options?: FindPlantsOptions): Promise<Plant[]> {
    return this.prisma.client.plant.findMany({
      where: {
        userId,
        ...(options?.healthStatus && { currentHealth: options.healthStatus }),
      },
      include: {
        species: true,
        photos: {
          take: 1,
          orderBy: { takenAt: 'desc' },
        },
      },
      orderBy: options?.sortBy || { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take || 20,
    });
  }

  async findByIdWithDetails(id: string, userId: string): Promise<PlantWithDetails | null> {
    return this.prisma.client.plant.findFirst({
      where: { id, userId },
      include: {
        species: true,
        photos: { orderBy: { takenAt: 'desc' } },
        healthIssues: {
          where: { status: { not: 'resolved' } },
          orderBy: { reportedAt: 'desc' },
        },
        careLogs: {
          take: 10,
          orderBy: { performedAt: 'desc' },
        },
      },
    });
  }
}
```

### Semantic Memory Search

```typescript
// src/providers/ai/embeddings.service.ts
@Injectable()
export class EmbeddingsService {
  async searchSimilar(
    userId: string,
    queryText: string,
    limit: number = 5,
  ): Promise<SemanticSearchResult[]> {
    // Generate embedding for query
    const embedding = await this.generateEmbedding(queryText);

    // Use raw query for vector search
    const results = await this.prisma.$queryRaw<SemanticSearchResult[]>`
      SELECT
        id,
        content_type,
        content_text,
        1 - (embedding <=> ${embedding}::vector) as similarity
      FROM semantic_memories
      WHERE user_id = ${userId}::uuid
      ORDER BY embedding <=> ${embedding}::vector
      LIMIT ${limit}
    `;

    return results;
  }
}
```

### Transaction Example

```typescript
// Create plant with initial photo
async createPlantWithPhoto(
  userId: string,
  data: CreatePlantDto,
  photoUrl: string,
): Promise<Plant> {
  return this.prisma.client.$transaction(async (tx) => {
    // Create plant
    const plant = await tx.plant.create({
      data: {
        userId,
        speciesId: data.speciesId,
        nickname: data.nickname,
        locationInHome: data.locationInHome,
        lightExposure: data.lightExposure,
        acquiredDate: data.acquiredDate,
        acquisitionMethod: data.acquisitionMethod,
      },
    });

    // Create photo record
    await tx.plantPhoto.create({
      data: {
        plantId: plant.id,
        storageUrl: photoUrl,
        type: 'identification',
        takenAt: new Date(),
        fileSize: 0, // Would be calculated from actual file
      },
    });

    // Create initial care reminders
    await tx.reminder.create({
      data: {
        userId,
        plantId: plant.id,
        action: 'watered',
        dueDate: addDays(new Date(), plant.wateringFrequencyDays),
        isRecurring: true,
        recurringFrequency: 'daily',
        recurringInterval: plant.wateringFrequencyDays,
      },
    });

    return plant;
  });
}
```

---

## Migrations

### Creating Migrations

```bash
# Create a new migration
pnpm prisma migrate dev --name add_feature_name

# Apply migrations to production
pnpm prisma migrate deploy

# Reset database (DANGEROUS - dev only)
pnpm prisma migrate reset
```

### Migration Best Practices

1. **Always create migrations for schema changes**
   ```bash
   # Don't use db push in production
   pnpm prisma db push  # Dev only
   ```

2. **Name migrations descriptively**
   ```bash
   pnpm prisma migrate dev --name add_plant_nickname_column
   pnpm prisma migrate dev --name create_semantic_memories_table
   ```

3. **Review generated SQL before applying**
   ```bash
   # Generated migration is in prisma/migrations/<timestamp>_<name>/migration.sql
   ```

4. **Handle data migrations separately**
   ```typescript
   // scripts/migrations/backfill-plant-health.ts
   async function backfillPlantHealth() {
     const plants = await prisma.plant.findMany({
       where: { currentHealth: null },
     });
     
     for (const plant of plants) {
       await prisma.plant.update({
         where: { id: plant.id },
         data: { currentHealth: 'healthy' },
       });
     }
   }
   ```

### Enable pgvector Extension

```sql
-- First migration should enable pgvector
-- prisma/migrations/00000000000000_init/migration.sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Seeding

### Seed Script

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed species data
  await seedSpecies();
  
  // Seed test user (dev only)
  if (process.env.NODE_ENV === 'development') {
    await seedTestUser();
  }
}

async function seedSpecies() {
  const species = [
    {
      scientificName: 'Epipremnum aureum',
      commonNames: ['Pothos', 'Devil\'s Ivy', 'Golden Pothos'],
      family: 'Araceae',
      genus: 'Epipremnum',
      lightRequirement: 'Low to bright indirect',
      waterFrequency: 'When top inch of soil is dry',
      humidityLevel: 'Average',
      temperature: '65-85°F (18-29°C)',
      toxicity: 'Toxic to pets and humans if ingested',
      difficulty: 'easy',
      description: 'Hardy trailing vine perfect for beginners.',
      propagationMethods: ['Stem cuttings in water', 'Stem cuttings in soil'],
      commonIssues: ['Yellow leaves from overwatering', 'Brown tips from low humidity'],
    },
    {
      scientificName: 'Monstera deliciosa',
      commonNames: ['Swiss Cheese Plant', 'Monstera', 'Split Leaf Philodendron'],
      family: 'Araceae',
      genus: 'Monstera',
      lightRequirement: 'Bright indirect',
      waterFrequency: 'When top 2 inches of soil is dry',
      humidityLevel: 'High',
      temperature: '65-85°F (18-29°C)',
      toxicity: 'Toxic to pets and humans if ingested',
      difficulty: 'moderate',
      description: 'Iconic tropical plant with distinctive split leaves.',
      propagationMethods: ['Stem cuttings', 'Air layering'],
      commonIssues: ['Brown edges from low humidity', 'Yellow leaves from overwatering'],
    },
    // Add more species...
  ];

  for (const sp of species) {
    await prisma.species.upsert({
      where: { scientificName: sp.scientificName },
      update: sp,
      create: sp,
    });
  }

  console.log(`Seeded ${species.length} species`);
}

async function seedTestUser() {
  const testUser = await prisma.user.upsert({
    where: { email: 'test@leafwise.app' },
    update: {},
    create: {
      email: 'test@leafwise.app',
      name: 'Test User',
      experienceLevel: 'beginner',
      city: 'San Francisco',
      climateZone: '10a',
      hemisphere: 'northern',
      homeType: 'apartment',
      lightConditions: 'medium',
      humidityLevel: 'medium',
    },
  });

  console.log(`Seeded test user: ${testUser.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Running Seeds

```bash
# Run seed
pnpm prisma db seed

# Or configure in package.json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## Row-Level Security (Supabase)

While Prisma handles most access control, Supabase RLS adds an extra layer:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
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

---

*Last Updated: December 2025*
