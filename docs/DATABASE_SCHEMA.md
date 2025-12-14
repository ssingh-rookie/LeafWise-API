# LeafWise Database Schema

> A complete guide to the database structure for developers and AI agents.

## Quick Reference

| Entity              | Purpose                 | Key Relations                        |
| ------------------- | ----------------------- | ------------------------------------ |
| User                | App users & settings    | Has many Plants, Sessions, Reminders |
| Species             | Plant species catalog   | Referenced by Plants                 |
| Plant               | User's plant collection | Belongs to User & Species            |
| HealthIssue         | Plant health problems   | Belongs to Plant                     |
| ConversationSession | AI chat sessions        | Belongs to User, optionally Plant    |
| Message             | Chat messages           | Belongs to ConversationSession       |
| Reminder            | Care reminders          | Belongs to User & Plant              |

---

## Entity Relationship Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────┐
│                           USER                                   │
│  (Central entity - all data belongs to a user)                  │
└─────────────────────────────────────────────────────────────────┘
         │
         │ has many
         ▼
┌─────────────────┐      references      ┌─────────────────┐
│     PLANT       │◄────────────────────►│    SPECIES      │
│  (User's plant) │                      │ (Plant catalog) │
└─────────────────┘                      └─────────────────┘
         │
         │ has many
         ├──────────────────┬──────────────────┬─────────────────┐
         ▼                  ▼                  ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐ ┌─────────────┐
│  HEALTH_ISSUE   │ │    CARE_LOG     │ │ PLANT_PHOTO │ │  REMINDER   │
│ (Plant problems)│ │ (Care history)  │ │  (Images)   │ │(Scheduled)  │
└─────────────────┘ └─────────────────┘ └─────────────┘ └─────────────┘
         │
         │ has many
         ▼
┌─────────────────┐
│ TREATMENT_STEP  │
│ (Fix steps)     │
└─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    CONVERSATION_SESSION                          │
│  (AI chat - belongs to User, optionally linked to Plant)        │
└─────────────────────────────────────────────────────────────────┘
         │
         │ has many
         ▼
┌─────────────────┐
│    MESSAGE      │
│ (Chat messages) │
└─────────────────┘

┌─────────────────┐        ┌─────────────────┐
│ SEMANTIC_MEMORY │        │   USAGE_LOG     │
│ (RAG vectors)   │        │ (API tracking)  │
│ Belongs to User │        │ Belongs to User │
└─────────────────┘        └─────────────────┘
```

---

## Entities in Detail

### 1. User

**Purpose**: Stores user accounts, preferences, and subscription info.

**Table**: `users`

| Field             | Type    | Description                            |
| ----------------- | ------- | -------------------------------------- |
| id                | UUID    | Primary key                            |
| email             | String  | Unique email address                   |
| name              | String  | Display name                           |
| experienceLevel   | Enum    | `beginner`, `intermediate`, `advanced` |
| subscriptionTier  | Enum    | `free`, `premium`                      |
| city              | String? | User's city (optional)                 |
| climateZone       | String? | Climate zone for care recommendations  |
| homeType          | Enum?   | `apartment`, `house`, `office`         |
| lightConditions   | Enum?   | `low`, `medium`, `bright`, `direct`    |
| humidityLevel     | Enum?   | `low`, `medium`, `high`                |
| wateringReminders | Boolean | Enable watering notifications          |
| healthAlerts      | Boolean | Enable health alert notifications      |
| tipsFrequency     | Enum    | `daily`, `weekly`, `none`              |

**Relations**:

- `plants` → Many Plants
- `conversationSessions` → Many ConversationSessions
- `semanticMemories` → Many SemanticMemories
- `usageLogs` → Many UsageLogs
- `reminders` → Many Reminders

**Common Queries**:

```typescript
// Get user with all plants
prisma.user.findUnique({
  where: { id: userId },
  include: { plants: true },
});

// Get premium users
prisma.user.findMany({
  where: { subscriptionTier: 'premium' },
});
```

---

### 2. Species

**Purpose**: Catalog of plant species with care requirements. Shared across all users.

**Table**: `species`

| Field              | Type     | Description                     |
| ------------------ | -------- | ------------------------------- |
| id                 | UUID     | Primary key                     |
| scientificName     | String   | Unique scientific name          |
| commonNames        | String[] | Array of common names           |
| family             | String   | Plant family                    |
| genus              | String   | Plant genus                     |
| lightRequirement   | String   | Light needs description         |
| waterFrequency     | String   | Watering frequency description  |
| humidityLevel      | String   | Humidity needs                  |
| temperature        | String   | Temperature range               |
| toxicity           | String?  | Toxicity info (pets, children)  |
| difficulty         | String   | `easy`, `moderate`, `difficult` |
| description        | String?  | Plant description               |
| propagationMethods | String[] | How to propagate                |
| commonIssues       | String[] | Known problems                  |

**Relations**:

- `plants` → Many Plants (referenced by user plants)

**Common Queries**:

```typescript
// Search species by name
prisma.species.findMany({
  where: {
    OR: [
      { scientificName: { contains: 'monstera', mode: 'insensitive' } },
      { commonNames: { has: 'Swiss Cheese Plant' } },
    ],
  },
});
```

---

### 3. Plant

**Purpose**: A user's individual plant in their collection.

**Table**: `plants`

| Field                 | Type      | Description                                     |
| --------------------- | --------- | ----------------------------------------------- |
| id                    | UUID      | Primary key                                     |
| userId                | UUID      | Owner (FK → User)                               |
| speciesId             | UUID      | Species type (FK → Species)                     |
| nickname              | String?   | User's name for the plant                       |
| locationInHome        | String    | Where it's placed                               |
| lightExposure         | Enum      | `low`, `medium`, `bright`, `direct`             |
| currentHealth         | Enum      | `thriving`, `healthy`, `struggling`, `critical` |
| wateringFrequencyDays | Int       | Days between watering (default: 7)              |
| lastWatered           | DateTime? | When last watered                               |
| nextWaterDue          | DateTime? | When to water next                              |
| acquiredDate          | DateTime? | When user got the plant                         |
| acquisitionMethod     | Enum      | `purchased`, `propagated`, `gifted`, `unknown`  |

**Relations**:

- `user` → User (belongs to)
- `species` → Species (references)
- `healthIssues` → Many HealthIssues
- `careLogs` → Many CareLogs
- `photos` → Many PlantPhotos
- `conversationSessions` → Many ConversationSessions
- `reminders` → Many Reminders

**Cascade Behavior**: When User is deleted, all their Plants are deleted.

**Common Queries**:

```typescript
// Get all plants for a user
prisma.plant.findMany({
  where: { userId },
  include: { species: true },
});

// Get plants needing water
prisma.plant.findMany({
  where: {
    userId,
    nextWaterDue: { lte: new Date() },
  },
});

// Get struggling plants
prisma.plant.findMany({
  where: {
    userId,
    currentHealth: { in: ['struggling', 'critical'] },
  },
});
```

---

### 4. HealthIssue

**Purpose**: Tracks plant health problems and their treatment.

**Table**: `health_issues`

| Field           | Type      | Description                                               |
| --------------- | --------- | --------------------------------------------------------- |
| id              | UUID      | Primary key                                               |
| plantId         | UUID      | Affected plant (FK → Plant)                               |
| issueType       | Enum      | `disease`, `pest`, `nutrient`, `environmental`, `unknown` |
| diagnosis       | String    | What's wrong                                              |
| confidence      | Float     | AI confidence score (0-1)                                 |
| symptoms        | String[]  | Observed symptoms                                         |
| treatmentPlan   | String?   | How to fix it                                             |
| cause           | String?   | Root cause                                                |
| status          | Enum      | `active`, `treating`, `resolved`, `recurring`             |
| reportedAt      | DateTime  | When issue was reported                                   |
| resolvedAt      | DateTime? | When issue was fixed                                      |
| diagnosisSource | String?   | How it was diagnosed                                      |

**Relations**:

- `plant` → Plant (belongs to)
- `treatmentSteps` → Many TreatmentSteps

**Common Queries**:

```typescript
// Get active issues for a plant
prisma.healthIssue.findMany({
  where: {
    plantId,
    status: { in: ['active', 'treating'] },
  },
  include: { treatmentSteps: true },
});
```

---

### 5. TreatmentStep

**Purpose**: Individual steps to treat a health issue.

**Table**: `treatment_steps`

| Field         | Type      | Description                     |
| ------------- | --------- | ------------------------------- |
| id            | UUID      | Primary key                     |
| healthIssueId | UUID      | Parent issue (FK → HealthIssue) |
| stepOrder     | Int       | Order in sequence (1, 2, 3...)  |
| action        | String    | What to do                      |
| details       | String?   | Additional info                 |
| timeline      | String?   | When to do it                   |
| priority      | String    | `immediate`, `soon`, `monitor`  |
| completed     | Boolean   | Is step done?                   |
| completedAt   | DateTime? | When completed                  |

**Relations**:

- `healthIssue` → HealthIssue (belongs to)

---

### 6. CareLog

**Purpose**: History of care actions performed on a plant.

**Table**: `care_logs`

| Field        | Type     | Description                                                        |
| ------------ | -------- | ------------------------------------------------------------------ |
| id           | UUID     | Primary key                                                        |
| plantId      | UUID     | Plant cared for (FK → Plant)                                       |
| action       | Enum     | `watered`, `fertilized`, `repotted`, `pruned`, `treated`, `custom` |
| customAction | String?  | Custom action description                                          |
| performedAt  | DateTime | When action was done                                               |
| notes        | String?  | Additional notes                                                   |

**Relations**:

- `plant` → Plant (belongs to)

---

### 7. PlantPhoto

**Purpose**: Photos of plants for identification, health tracking, or progress.

**Table**: `plant_photos`

| Field        | Type     | Description                            |
| ------------ | -------- | -------------------------------------- |
| id           | UUID     | Primary key                            |
| plantId      | UUID     | Plant in photo (FK → Plant)            |
| storageUrl   | String   | Full image URL                         |
| thumbnailUrl | String?  | Thumbnail URL                          |
| type         | String   | `identification`, `health`, `progress` |
| takenAt      | DateTime | When photo was taken                   |
| fileSize     | Int      | File size in bytes                     |

**Relations**:

- `plant` → Plant (belongs to)

---

### 8. ConversationSession

**Purpose**: An AI chat session with the user.

**Table**: `conversation_sessions`

| Field             | Type     | Description                         |
| ----------------- | -------- | ----------------------------------- |
| id                | UUID     | Primary key                         |
| userId            | UUID     | User chatting (FK → User)           |
| plantId           | UUID?    | Optional plant context (FK → Plant) |
| startedAt         | DateTime | Session start                       |
| lastMessageAt     | DateTime | Last activity                       |
| messageCount      | Int      | Total messages                      |
| totalInputTokens  | Int      | AI input tokens used                |
| totalOutputTokens | Int      | AI output tokens used               |
| estimatedCost     | Float    | Estimated API cost                  |
| modelsUsed        | String[] | AI models used                      |

**Relations**:

- `user` → User (belongs to)
- `plant` → Plant? (optional context)
- `messages` → Many Messages

**Common Queries**:

```typescript
// Get recent sessions for a user
prisma.conversationSession.findMany({
  where: { userId },
  orderBy: { lastMessageAt: 'desc' },
  take: 10,
  include: { messages: true },
});
```

---

### 9. Message

**Purpose**: Individual messages in a conversation.

**Table**: `messages`

| Field            | Type    | Description                               |
| ---------------- | ------- | ----------------------------------------- |
| id               | UUID    | Primary key                               |
| sessionId        | UUID    | Parent session (FK → ConversationSession) |
| role             | String  | `user`, `assistant`, `system`             |
| content          | String  | Message text                              |
| modelUsed        | String? | AI model (for assistant messages)         |
| inputTokens      | Int?    | Tokens in prompt                          |
| outputTokens     | Int?    | Tokens in response                        |
| actionItems      | Json?   | Extracted action items                    |
| plantsMentioned  | UUID[]  | Plants referenced                         |
| issuesIdentified | UUID[]  | Issues found                              |

**Relations**:

- `session` → ConversationSession (belongs to)

---

### 10. SemanticMemory

**Purpose**: Vector embeddings for RAG (Retrieval Augmented Generation).

**Table**: `semantic_memories`

| Field           | Type         | Description                                      |
| --------------- | ------------ | ------------------------------------------------ |
| id              | UUID         | Primary key                                      |
| userId          | UUID         | Owner (FK → User)                                |
| contentType     | Enum         | `conversation`, `diagnosis`, `advice`, `outcome` |
| contentText     | String       | Text content                                     |
| embedding       | Vector(1536) | OpenAI embedding vector                          |
| sourceSessionId | UUID?        | Source conversation                              |
| sourcePlantId   | UUID?        | Related plant                                    |
| relevanceScore  | Float        | Importance (0-1)                                 |

**Relations**:

- `user` → User (belongs to)

**Note**: Uses pgvector extension for similarity search.

---

### 11. Reminder

**Purpose**: Scheduled care reminders for plants.

**Table**: `reminders`

| Field              | Type     | Description                                                        |
| ------------------ | -------- | ------------------------------------------------------------------ |
| id                 | UUID     | Primary key                                                        |
| userId             | UUID     | User to remind (FK → User)                                         |
| plantId            | UUID     | Plant to care for (FK → Plant)                                     |
| action             | Enum     | `watered`, `fertilized`, `repotted`, `pruned`, `treated`, `custom` |
| customAction       | String?  | Custom action description                                          |
| dueDate            | DateTime | When reminder is due                                               |
| priority           | Enum     | `low`, `medium`, `high`                                            |
| isRecurring        | Boolean  | Does it repeat?                                                    |
| recurringFrequency | String?  | `daily`, `weekly`, `monthly`                                       |
| recurringInterval  | Int?     | Interval number                                                    |
| completed          | Boolean  | Is it done?                                                        |
| skipped            | Boolean  | Was it skipped?                                                    |

**Relations**:

- `user` → User (belongs to)
- `plant` → Plant (belongs to)

**Common Queries**:

```typescript
// Get upcoming reminders
prisma.reminder.findMany({
  where: {
    userId,
    completed: false,
    skipped: false,
    dueDate: { gte: new Date() },
  },
  orderBy: { dueDate: 'asc' },
});
```

---

### 12. UsageLog

**Purpose**: Track AI API usage and costs.

**Table**: `usage_logs`

| Field        | Type    | Description                                                |
| ------------ | ------- | ---------------------------------------------------------- |
| id           | UUID    | Primary key                                                |
| userId       | UUID    | User (FK → User)                                           |
| action       | String  | `identification`, `health_assessment`, `chat`, `embedding` |
| provider     | String  | `plant-id`, `claude`, `openai`, `gemini`                   |
| model        | String? | Specific model used                                        |
| cost         | Float   | API cost                                                   |
| inputTokens  | Int?    | Input tokens                                               |
| outputTokens | Int?    | Output tokens                                              |
| endpoint     | String? | API endpoint                                               |
| latencyMs    | Int?    | Response time                                              |
| success      | Boolean | Did it succeed?                                            |
| errorCode    | String? | Error code if failed                                       |

**Relations**:

- `user` → User (belongs to)

---

## Enum Reference

### User Enums

| Enum             | Values                                 |
| ---------------- | -------------------------------------- |
| ExperienceLevel  | `beginner`, `intermediate`, `advanced` |
| HomeType         | `apartment`, `house`, `office`         |
| LightCondition   | `low`, `medium`, `bright`, `direct`    |
| HumidityLevel    | `low`, `medium`, `high`                |
| SubscriptionTier | `free`, `premium`                      |
| TipsFrequency    | `daily`, `weekly`, `none`              |

### Plant Enums

| Enum              | Values                                                             |
| ----------------- | ------------------------------------------------------------------ |
| AcquisitionMethod | `purchased`, `propagated`, `gifted`, `unknown`                     |
| PlantHealth       | `thriving`, `healthy`, `struggling`, `critical`                    |
| CareAction        | `watered`, `fertilized`, `repotted`, `pruned`, `treated`, `custom` |

### Health Enums

| Enum        | Values                                                    |
| ----------- | --------------------------------------------------------- |
| IssueType   | `disease`, `pest`, `nutrient`, `environmental`, `unknown` |
| IssueStatus | `active`, `treating`, `resolved`, `recurring`             |

### Other Enums

| Enum             | Values                                           |
| ---------------- | ------------------------------------------------ |
| ReminderPriority | `low`, `medium`, `high`                          |
| ContentType      | `conversation`, `diagnosis`, `advice`, `outcome` |

---

## Cascade Delete Rules

When entities are deleted, related data is handled as follows:

| Parent Deleted      | Child Action                                                  |
| ------------------- | ------------------------------------------------------------- |
| User                | All Plants, Sessions, Memories, Logs, Reminders → **Deleted** |
| Plant               | All HealthIssues, CareLogs, Photos, Reminders → **Deleted**   |
| Plant               | ConversationSession.plantId → **Set to NULL**                 |
| HealthIssue         | All TreatmentSteps → **Deleted**                              |
| ConversationSession | All Messages → **Deleted**                                    |

---

## Indexes

Key indexes for query performance:

| Table                 | Index Fields              | Purpose            |
| --------------------- | ------------------------- | ------------------ |
| plants                | userId                    | Get user's plants  |
| plants                | userId, currentHealth     | Filter by health   |
| plants                | userId, nextWaterDue      | Watering schedule  |
| health_issues         | plantId                   | Get plant issues   |
| health_issues         | plantId, status           | Active issues      |
| conversation_sessions | userId                    | User's sessions    |
| conversation_sessions | userId, lastMessageAt     | Recent sessions    |
| messages              | sessionId                 | Session messages   |
| reminders             | userId, dueDate           | Upcoming reminders |
| usage_logs            | userId, action, createdAt | Usage analytics    |

---

## Database Extensions

| Extension | Purpose                                     |
| --------- | ------------------------------------------- |
| pgvector  | Vector similarity search for SemanticMemory |
| uuid-ossp | Auto-generate UUIDs                         |
