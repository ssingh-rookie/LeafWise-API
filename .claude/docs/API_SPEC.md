# LeafWise API - API Specification

> **Reference Document for AI Agents**
> This document defines all API endpoints, request/response formats, and error handling.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [Endpoints](#endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

---

## Overview

### Base URL

| Environment | URL                                |
| ----------- | ---------------------------------- |
| Production  | `https://api.leafwise.app`         |
| Staging     | `https://staging-api.leafwise.app` |
| Local       | `http://localhost:3000`            |

### API Version

All endpoints are prefixed with `/api/v1`.

### Content Type

```
Content-Type: application/json
Accept: application/json
```

---

## Authentication

### JWT Bearer Token

All authenticated endpoints require a valid JWT token from Supabase Auth:

```http
Authorization: Bearer <jwt_token>
```

### Token Payload

```typescript
interface JWTPayload {
  sub: string; // User ID
  email: string; // User email
  role: string; // 'authenticated'
  iat: number; // Issued at
  exp: number; // Expiration
}
```

### Unauthenticated Endpoints

| Endpoint                            | Description               |
| ----------------------------------- | ------------------------- |
| `POST /api/v1/auth/signup`          | User registration         |
| `POST /api/v1/auth/login`           | User login                |
| `POST /api/v1/auth/refresh`         | Refresh token             |
| `POST /api/v1/auth/forgot-password` | Request password reset    |
| `POST /api/v1/auth/reset-password`  | Reset password with token |
| `GET /api/v1/health`                | Health check              |

---

## Common Patterns

### Standard Response Envelope

**Success Response:**

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    aiCost?: number; // AI operation cost in USD
    processingTime?: number; // Time in milliseconds
  };
}
```

**Error Response:**

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string; // Machine-readable error code
    message: string; // Human-readable message
    details?: unknown; // Additional error context
    timestamp: string; // ISO 8601 timestamp
    path: string; // Request path
    requestId: string; // For debugging
  };
}
```

### Pagination

```typescript
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Request: GET /api/v1/plants?page=1&limit=10
// Response includes meta.pagination
```

### Filtering & Sorting

```http
GET /api/v1/plants?status=healthy&sort=-createdAt&limit=10
```

- **Filter**: `field=value`
- **Sort**: `sort=field` (asc) or `sort=-field` (desc)
- **Pagination**: `page=1&limit=10`

---

## Endpoints

### Authentication Module

#### POST /api/v1/auth/signup

Create a new user account.

**Request:**

```typescript
interface SignupRequest {
  email: string;
  password: string;
  name: string;
}
```

**Response:**

```typescript
interface SignupResponse {
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      createdAt: string;
    };
    session: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    };
  };
}
```

#### POST /api/v1/auth/login

Authenticate user and receive tokens.

**Request:**

```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Response:** Same as signup response.

#### POST /api/v1/auth/forgot-password

Request a password reset email. Rate limited to 3 requests per minute.

**Request:**

```typescript
interface ForgotPasswordRequest {
  email: string;
}
```

**Response:**

```typescript
interface ForgotPasswordResponse {
  message: string; // Always returns success message for security
}
```

**Security Notes:**

- Always returns 200 OK regardless of whether email exists (prevents enumeration)
- Reset link sent via Supabase email
- Link expires in ~1 hour

#### POST /api/v1/auth/reset-password

Reset password using token from email. Rate limited to 5 requests per minute.

**Request:**

```typescript
interface ResetPasswordRequest {
  token: string; // Recovery token from email link
  newPassword: string; // Min 8 characters
}
```

**Response:**

```typescript
interface ResetPasswordResponse {
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}
```

**Error Codes:**
| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Invalid or expired reset token |

---

### Users Module

#### GET /api/v1/users/me

Get current user profile.

**Response:**

```typescript
interface UserProfileResponse {
  success: true;
  data: {
    id: string;
    email: string;
    name: string;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    location: {
      city: string;
      climateZone: string;
      hemisphere: 'northern' | 'southern';
    } | null;
    homeEnvironment: {
      type: 'apartment' | 'house' | 'office';
      lightConditions: 'low' | 'medium' | 'bright';
      humidityLevel: 'low' | 'medium' | 'high';
    } | null;
    subscription: {
      tier: 'free' | 'premium';
      expiresAt: string | null;
    };
    createdAt: string;
    updatedAt: string;
  };
}
```

#### PATCH /api/v1/users/me

Update current user profile.

**Request:**

```typescript
interface UpdateUserRequest {
  name?: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  location?: {
    city: string;
    climateZone: string;
    hemisphere: 'northern' | 'southern';
  };
  homeEnvironment?: {
    type: 'apartment' | 'house' | 'office';
    lightConditions: 'low' | 'medium' | 'bright';
    humidityLevel: 'low' | 'medium' | 'high';
  };
  notificationPreferences?: {
    wateringReminders: boolean;
    healthAlerts: boolean;
    tipsFrequency: 'daily' | 'weekly' | 'none';
  };
}
```

---

### Plants Module

#### GET /api/v1/plants

List user's plant collection.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 50) |
| status | string | - | Filter by health status |
| sort | string | -createdAt | Sort field |

**Response:**

```typescript
interface PlantsListResponse {
  success: true;
  data: Array<{
    id: string;
    speciesName: string;
    commonName: string;
    nickname: string | null;
    locationInHome: string;
    currentHealth: 'thriving' | 'healthy' | 'struggling' | 'critical';
    lastWatered: string | null;
    nextWaterDue: string | null;
    photoUrl: string | null;
    createdAt: string;
  }>;
  meta: {
    pagination: PaginationMeta;
  };
}
```

#### GET /api/v1/plants/:id

Get single plant details.

**Response:**

```typescript
interface PlantDetailResponse {
  success: true;
  data: {
    id: string;
    speciesId: string;
    speciesName: string;
    commonName: string;
    nickname: string | null;
    acquiredDate: string;
    acquisitionMethod: 'purchased' | 'propagated' | 'gifted' | 'unknown';
    locationInHome: string;
    lightExposure: 'low' | 'medium' | 'bright' | 'direct';
    currentHealth: 'thriving' | 'healthy' | 'struggling' | 'critical';

    careSchedule: {
      wateringFrequencyDays: number;
      lastWatered: string | null;
      nextWaterDue: string | null;
      fertilizingFrequencyWeeks: number;
      lastFertilized: string | null;
      lastRepotted: string | null;
    };

    activeIssues: Array<{
      id: string;
      type: string;
      diagnosis: string;
      status: 'active' | 'treating' | 'resolved';
      reportedAt: string;
    }>;

    photos: Array<{
      id: string;
      url: string;
      takenAt: string;
      type: 'identification' | 'health' | 'progress';
    }>;

    careHistory: Array<{
      id: string;
      action: 'watered' | 'fertilized' | 'repotted' | 'pruned';
      performedAt: string;
      notes: string | null;
    }>;

    createdAt: string;
    updatedAt: string;
  };
}
```

#### POST /api/v1/plants

Add a new plant to collection.

**Request:**

```typescript
interface CreatePlantRequest {
  speciesId: string; // From identification or manual selection
  nickname?: string;
  acquiredDate?: string; // ISO 8601 date
  acquisitionMethod?: 'purchased' | 'propagated' | 'gifted' | 'unknown';
  locationInHome: string;
  lightExposure: 'low' | 'medium' | 'bright' | 'direct';
  photoId?: string; // Reference to uploaded photo
}
```

**Response:** `PlantDetailResponse`

#### PATCH /api/v1/plants/:id

Update plant details.

**Request:**

```typescript
interface UpdatePlantRequest {
  nickname?: string;
  locationInHome?: string;
  lightExposure?: 'low' | 'medium' | 'bright' | 'direct';
  wateringFrequencyDays?: number;
  fertilizingFrequencyWeeks?: number;
}
```

#### DELETE /api/v1/plants/:id

Remove plant from collection.

**Response:**

```typescript
{
  success: true,
  data: {
    id: string;
    deleted: true;
  }
}
```

#### POST /api/v1/plants/:id/care

Log a care action.

**Request:**

```typescript
interface LogCareRequest {
  action: 'watered' | 'fertilized' | 'repotted' | 'pruned';
  performedAt?: string; // Defaults to now
  notes?: string;
}
```

---

### Identification Module

#### POST /api/v1/identify

Identify a plant from image.

**Request:**

```typescript
interface IdentifyRequest {
  image: string; // Base64 encoded image
  imageFormat: 'jpeg' | 'png';
  includeSimilar?: boolean; // Default: true
  addToCollection?: boolean; // Default: false
  collectionData?: {
    // Required if addToCollection is true
    nickname?: string;
    locationInHome: string;
    lightExposure: 'low' | 'medium' | 'bright' | 'direct';
  };
}
```

**Response:**

```typescript
interface IdentifyResponse {
  success: true;
  data: {
    identification: {
      species: {
        id: string;
        scientificName: string;
        commonNames: string[];
        family: string;
        confidence: number; // 0-1
      };
      similarSpecies: Array<{
        scientificName: string;
        commonName: string;
        confidence: number;
        imageUrl: string;
      }>;
      careSummary: {
        light: string;
        water: string;
        humidity: string;
        temperature: string;
        toxicity: string;
        difficulty: 'easy' | 'moderate' | 'difficult';
      };
    };
    plantId: string | null; // If added to collection
  };
  meta: {
    aiCost: number;
    processingTime: number;
    provider: 'plant-id' | 'gemini';
  };
}
```

**Error Codes:**
| Code | Description |
|------|-------------|
| `IDENTIFICATION_FAILED` | Could not identify plant |
| `IMAGE_INVALID` | Image format not supported or corrupted |
| `IMAGE_TOO_LARGE` | Image exceeds 5MB limit |
| `LIMIT_EXCEEDED` | Free tier identification limit reached |

---

### Health Module

#### POST /api/v1/health/assess

Assess plant health from images and symptoms.

**Request:**

```typescript
interface HealthAssessRequest {
  plantId: string; // Existing plant in collection
  images: string[]; // Base64, max 3 images
  symptomsDescription?: string; // Optional text description
}
```

**Response:**

```typescript
interface HealthAssessResponse {
  success: true;
  data: {
    assessment: {
      overallHealth: 'healthy' | 'issues_detected' | 'critical';
      issues: Array<{
        type: 'disease' | 'pest' | 'nutrient' | 'environmental';
        name: string;
        probability: number; // 0-1
        description: string;
        symptomsMatched: string[];
        cause: string;
      }>;
      treatmentRecommendations: Array<{
        priority: 'immediate' | 'soon' | 'monitor';
        action: string;
        details: string;
        timeline: string;
      }>;
    };
    healthIssueId: string; // Created issue record
    disclaimer: string; // Legal disclaimer
  };
  meta: {
    aiCost: number;
    processingTime: number;
    providers: string[];
  };
}
```

#### GET /api/v1/health/issues/:plantId

Get health issue history for a plant.

**Response:**

```typescript
interface HealthIssuesResponse {
  success: true;
  data: Array<{
    id: string;
    type: 'disease' | 'pest' | 'nutrient' | 'environmental';
    diagnosis: string;
    confidence: number;
    symptoms: string[];
    treatmentPlan: string;
    status: 'active' | 'treating' | 'resolved' | 'recurring';
    reportedAt: string;
    resolvedAt: string | null;
  }>;
}
```

#### PATCH /api/v1/health/issues/:issueId

Update health issue status.

**Request:**

```typescript
interface UpdateHealthIssueRequest {
  status: 'treating' | 'resolved' | 'recurring';
  notes?: string;
}
```

---

### Chat Module

#### POST /api/v1/chat

Send a message to the AI assistant.

**Request:**

```typescript
interface ChatRequest {
  sessionId?: string; // Null for new conversation
  message: string;
  plantId?: string; // Optional plant context
  imageBase64?: string; // Optional image attachment
}
```

**Response:**

```typescript
interface ChatResponse {
  success: true;
  data: {
    sessionId: string;
    response: {
      content: string;
      actionItems: Array<{
        action: string;
        plantId: string | null;
        dueDate: string | null;
        created: boolean;
      }>;
      plantsReferenced: Array<{
        id: string;
        nickname: string;
        species: string;
      }>;
      followUpQuestions: string[];
    };
    disclaimer: string;
  };
  meta: {
    contextUsed: {
      plantsReferenced: number;
      memoriesRetrieved: number;
      tokensUsed: number;
    };
    aiCost: number;
    model: string;
  };
}
```

#### GET /api/v1/chat/sessions

List user's chat sessions.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| plantId | string | - | Filter by plant |

**Response:**

```typescript
interface ChatSessionsResponse {
  success: true;
  data: Array<{
    id: string;
    plantId: string | null;
    plantNickname: string | null;
    lastMessage: string;
    messageCount: number;
    startedAt: string;
    lastMessageAt: string;
  }>;
  meta: {
    pagination: PaginationMeta;
  };
}
```

#### GET /api/v1/chat/sessions/:sessionId

Get full conversation history.

**Response:**

```typescript
interface ChatSessionDetailResponse {
  success: true;
  data: {
    id: string;
    plantId: string | null;
    messages: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
      actionItems?: Array<{
        action: string;
        completed: boolean;
      }>;
    }>;
    startedAt: string;
    lastMessageAt: string;
  };
}
```

#### POST /api/v1/chat/stream

Send a message with streaming response (SSE).

**Request:** Same as `POST /api/v1/chat`

**Response:** Server-Sent Events stream

```typescript
// Event types:
interface StreamEvent {
  type: 'start' | 'chunk' | 'done' | 'error';
  data: {
    sessionId?: string; // On 'start'
    content?: string; // On 'chunk'
    response?: ChatResponse; // On 'done'
    error?: ErrorResponse; // On 'error'
  };
}
```

---

### Care Module

#### GET /api/v1/care/reminders

Get upcoming care reminders.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 7 | Days ahead to fetch |
| plantId | string | - | Filter by plant |

**Response:**

```typescript
interface RemindersResponse {
  success: true;
  data: {
    today: Array<CareReminder>;
    upcoming: Array<CareReminder>;
    overdue: Array<CareReminder>;
  };
}

interface CareReminder {
  id: string;
  plantId: string;
  plantNickname: string;
  plantSpecies: string;
  action: 'water' | 'fertilize' | 'repot' | 'checkHealth';
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  isOverdue: boolean;
}
```

#### POST /api/v1/care/reminders/:id/complete

Mark a reminder as completed.

**Request:**

```typescript
interface CompleteReminderRequest {
  completedAt?: string; // Defaults to now
  notes?: string;
  skipped?: boolean; // If skipping instead of completing
}
```

#### POST /api/v1/care/reminders

Create a custom reminder.

**Request:**

```typescript
interface CreateReminderRequest {
  plantId: string;
  action: 'water' | 'fertilize' | 'repot' | 'checkHealth' | 'custom';
  customAction?: string; // Required if action is 'custom'
  dueDate: string;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
  };
}
```

---

### Subscriptions Module

#### GET /api/v1/subscriptions/status

Get current subscription status and usage.

**Response:**

```typescript
interface SubscriptionStatusResponse {
  success: true;
  data: {
    tier: 'free' | 'premium';
    expiresAt: string | null;
    usage: {
      period: 'month';
      periodStart: string;
      periodEnd: string;
      plants: { used: number; limit: number | null };
      identifications: { used: number; limit: number };
      healthAssessments: { used: number; limit: number };
      chatMessages: { used: number; limit: number };
    };
    features: {
      unlimitedPlants: boolean;
      unlimitedIdentifications: boolean;
      unlimitedHealthAssessments: boolean;
      unlimitedChat: boolean;
      priorityAI: boolean;
      advancedReminders: boolean;
      conversationHistory: 'limited' | 'unlimited';
      offlineDatabase: boolean;
    };
  };
}
```

#### POST /api/v1/subscriptions/upgrade

Initiate subscription upgrade.

**Request:**

```typescript
interface UpgradeRequest {
  plan: 'premium_monthly' | 'premium_yearly';
  paymentMethod: string; // Stripe payment method ID
}
```

**Response:**

```typescript
interface UpgradeResponse {
  success: true;
  data: {
    subscriptionId: string;
    clientSecret: string; // For Stripe confirmation
    status: 'pending' | 'active';
  };
}
```

---

## Error Handling

### HTTP Status Codes

| Status | Meaning                                       |
| ------ | --------------------------------------------- |
| 200    | Success                                       |
| 201    | Created                                       |
| 400    | Bad Request - Invalid input                   |
| 401    | Unauthorized - Invalid or missing token       |
| 402    | Payment Required - Subscription limit reached |
| 403    | Forbidden - Insufficient permissions          |
| 404    | Not Found - Resource doesn't exist            |
| 422    | Unprocessable Entity - Validation failed      |
| 429    | Too Many Requests - Rate limit exceeded       |
| 500    | Internal Server Error                         |
| 503    | Service Unavailable - AI providers down       |

### Error Codes

| Code                    | HTTP Status | Description                      |
| ----------------------- | ----------- | -------------------------------- |
| `AUTH_INVALID_TOKEN`    | 401         | JWT token is invalid or expired  |
| `AUTH_MISSING_TOKEN`    | 401         | No authorization header provided |
| `USER_NOT_FOUND`        | 404         | User account not found           |
| `PLANT_NOT_FOUND`       | 404         | Plant not in user's collection   |
| `VALIDATION_ERROR`      | 422         | Request body validation failed   |
| `LIMIT_EXCEEDED`        | 402         | Feature usage limit reached      |
| `IMAGE_INVALID`         | 400         | Invalid image format             |
| `IMAGE_TOO_LARGE`       | 400         | Image exceeds size limit         |
| `IDENTIFICATION_FAILED` | 500         | Could not identify plant         |
| `AI_PROVIDER_ERROR`     | 503         | AI service unavailable           |
| `RATE_LIMIT_EXCEEDED`   | 429         | Too many requests                |

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "LIMIT_EXCEEDED",
    "message": "You have reached your monthly limit of 5 plant identifications. Upgrade to Premium for unlimited identifications.",
    "details": {
      "feature": "identification",
      "used": 5,
      "limit": 5,
      "resetsAt": "2025-01-01T00:00:00Z"
    },
    "timestamp": "2024-12-13T10:30:00Z",
    "path": "/api/v1/identify",
    "requestId": "req_abc123"
  }
}
```

---

## Rate Limiting

### Limits by Tier

| Endpoint                | Free Tier | Premium Tier |
| ----------------------- | --------- | ------------ |
| General API             | 100/hour  | 1000/hour    |
| `/api/v1/identify`      | 5/month   | Unlimited    |
| `/api/v1/health/assess` | 2/month   | Unlimited    |
| `/api/v1/chat`          | 10/month  | Unlimited    |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702468800
X-RateLimit-Feature: identification
X-RateLimit-Feature-Limit: 5
X-RateLimit-Feature-Remaining: 3
```

---

## OpenAPI Specification

The full OpenAPI 3.0 specification is available at:

- **Development:** `http://localhost:3000/api/docs`
- **Production:** `https://api.leafwise.app/api/docs`

---

_Last Updated: December 2025_
