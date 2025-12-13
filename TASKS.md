# LeafWise API - Implementation Tasks

## AI Integrations

### 1. Plant.id Integration
**File:** `src/providers/ai/plant-id.provider.ts`
- Create provider class with API client
- Implement `identify(imageBase64)` - plant identification
- Implement `assessHealth(imageBase64)` - health diagnosis
- Add retry logic with exponential backoff
- Return typed results: species, confidence, health issues

### 2. Claude Integration
**File:** `src/providers/ai/claude.provider.ts`
- Create provider with Anthropic SDK
- Implement `chat(systemPrompt, messages)` - conversational AI
- Implement `stream(systemPrompt, messages)` - streaming responses
- Use claude-haiku for simple queries, claude-sonnet for complex
- Handle rate limits gracefully

### 3. OpenAI Integration
**File:** `src/providers/ai/openai.provider.ts`
- Create provider with OpenAI SDK
- Implement `chat(systemPrompt, messages)` - fallback for Claude
- Implement `embed(text)` - generate embeddings for semantic search
- Use gpt-4o-mini for chat, text-embedding-3-small for embeddings

### 4. Gemini Integration
**File:** `src/providers/ai/gemini.provider.ts`
- Create provider with Google AI SDK
- Implement `identifyPlant(imageBase64)` - fallback for Plant.id
- Implement `analyzeImage(imageBase64, prompt)` - vision analysis

### 5. AI Router (Orchestration)
**File:** `src/providers/ai/ai-router.service.ts`
- Wire up all providers with fallback chains:
  - Identification: Plant.id → Gemini
  - Health: Plant.id → OpenAI
  - Chat: Claude → OpenAI
  - Embeddings: OpenAI
- Add cost tracking per request
- Log all AI calls for debugging

---

## Feature Modules

### 6. Identification Module
**Files:** `src/modules/identification/*.ts`
- `POST /identify` - accept image, return species + care info
- Save identification to database
- Store photo via StorageService
- Create plant record if user confirms

### 7. Health Diagnosis Module
**Files:** `src/modules/health/*.ts`
- `POST /health/assess` - analyze plant photo for issues
- `GET /health/issues/:plantId` - get issue history
- `PATCH /health/issues/:id` - mark issue resolved
- Store diagnosis results with treatment steps

### 8. Chat Module
**Files:** `src/modules/chat/*.ts`
- `POST /chat` - send message, get response
- `POST /chat/stream` - SSE streaming response
- `GET /chat/sessions` - list user's chat sessions
- Build context from user's plants + history
- Store messages for conversation continuity

### 9. Care Module
**Files:** `src/modules/care/*.ts`
- `GET /care/schedule` - get upcoming care tasks
- `POST /care/log` - log care action (watered, fertilized, etc.)
- `POST /care/reminders` - create custom reminder
- Calculate next care dates from species data

### 10. Subscriptions Module
**Files:** `src/modules/subscriptions/*.ts`
- `GET /subscriptions/status` - get current tier
- `POST /subscriptions/upgrade` - initiate Stripe checkout
- `POST /webhooks/stripe` - handle Stripe events
- Gate premium features by subscription tier

---

## Supporting Components

### 11. Context Builder Service
**File:** `src/modules/chat/context.service.ts`
- Fetch user profile + preferences
- Fetch relevant plants + recent care logs
- Semantic search past conversations (pgvector)
- Format context for AI prompts

### 12. Prompt Templates
**File:** `src/providers/ai/prompts/*.ts`
- System prompts for each AI task
- Plant care expert persona
- Response formatting instructions
- Keep prompts versioned and testable

### 13. Usage Tracking
**File:** `src/modules/usage/usage.service.ts`
- Track API calls per user
- Track AI token usage + costs
- Enforce rate limits by tier
- Monthly usage reset logic

---

## Priority Order
1. Plant.id + Gemini → Identification works
2. Claude + OpenAI → Chat works
3. Health diagnosis
4. Care scheduling
5. Context builder + semantic search
6. Subscriptions + usage tracking
