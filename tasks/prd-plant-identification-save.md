# Product Requirements Document: Plant Identification & Save

## Introduction/Overview

The plant identification and save feature enables users to identify unknown plants by uploading images and save them to their personal plant collection. This feature addresses a core user need: "What plant is this?" and seamlessly transitions from discovery to ongoing plant care management.

**Problem Statement**: Users often acquire or encounter plants without knowing their species, making it impossible to provide proper care. Manual identification through books or online searches is time-consuming and error-prone. Users also want to manage multiple instances of the same plant species (e.g., three different Peace Lilies in different locations).

**Solution**: Leverage AI-powered plant identification (Plant.id API) to instantly identify plants from photos, then allow users to save identified plants to their collection with custom nicknames and location tracking.

## Goals

1. **Accurate Identification**: Achieve >85% identification accuracy for common houseplants and garden plants
2. **Fast Response Time**: Return identification results within 3-5 seconds under normal conditions
3. **Multiple Match Support**: Provide 3-5 alternative species suggestions when confidence is below 70%
4. **Seamless Save Flow**: Enable users to save identified plants with 2-3 taps/clicks
5. **Multi-Instance Management**: Support users managing multiple instances of the same species with distinct nicknames
6. **Care Integration**: Automatically populate care schedules based on identified species requirements

## User Stories

### Primary User Stories

**US-1: First-Time Plant Identification**

> As a new plant parent, I want to upload a photo of my plant and get instant identification results, so I can learn what species I have and how to care for it.

**Acceptance Criteria**:

- User can upload image via API endpoint
- System returns species name, common names, and confidence score within 5 seconds
- If confidence < 70%, system provides 3-5 alternative matches
- Species information includes care requirements (light, water, humidity, temperature)

**US-2: Saving Identified Plant to Collection**

> As a plant enthusiast, I want to save my identified plant with a custom nickname and location, so I can track its care and health over time.

**Acceptance Criteria**:

- User can save plant after viewing identification results
- User can provide custom nickname (e.g., "Monstera in Living Room")
- User can specify location in home
- System creates plant record linked to user and species
- System sets default watering schedule based on species data

**US-3: Managing Multiple Plants of Same Species**

> As a plant collector, I want to save multiple plants of the same species with different nicknames, so I can manage each plant individually even though they're the same type.

**Acceptance Criteria**:

- System allows saving multiple plants with same speciesId
- Each plant has unique nickname (e.g., "Peace Lily 1", "Peace Lily 2", "Peace Lily - Office")
- Each plant tracks independent care schedules and health status
- User can differentiate plants by nickname and location

### Secondary User Stories

**US-4: Low Confidence Identification**

> As a user, when the system is uncertain about my plant's identity, I want to see multiple possible matches with confidence scores, so I can research and choose the correct species myself.

**Acceptance Criteria**:

- When confidence < 70%, return 3-5 ranked alternatives
- Each alternative shows confidence percentage
- Each alternative includes species name and common names
- User can select from alternatives when saving to collection

**US-5: Identification Photo Storage**

> As a user, I want my identification photos saved with my plant record, so I can track my plant's growth and refer back to the original identification image.

**Acceptance Criteria**:

- Identification photo is uploaded to Supabase Storage
- Photo URL is stored in PlantPhoto table with type='identification'
- Photo is linked to plant record after user confirms save
- Thumbnail is generated for fast loading in app

## Functional Requirements

### FR-1: Plant Identification Endpoint

**Endpoint**: `POST /api/v1/identification/identify`

**Authentication**: Required (JWT Bearer token)

**Request**:

```json
{
  "image": "base64_encoded_image_string",
  "includeHealthAssessment": false
}
```

**Request Validation**:

1. Image is required and must be base64-encoded
2. Image size must not exceed 10MB
3. Image format must be JPEG, PNG, or HEIC
4. User must be authenticated

**Processing Logic**:

1. Decode and validate image
2. Upload image to Supabase Storage (`/plant-photos/{userId}/{timestamp}-identification.jpg`)
3. Generate thumbnail (300x300px)
4. Call Plant.id API with image
5. Parse identification results
6. If confidence >= 70%: Return single best match
7. If confidence < 70%: Return top 3-5 matches
8. Create PlantPhoto record (temporarily unlinked to plant)
9. For each match, fetch or create Species record from database

**Response (High Confidence)**:

```json
{
  "success": true,
  "data": {
    "identificationId": "uuid",
    "photoUrl": "https://...",
    "thumbnailUrl": "https://...",
    "matches": [
      {
        "confidence": 0.92,
        "species": {
          "id": "uuid",
          "scientificName": "Monstera deliciosa",
          "commonNames": ["Swiss Cheese Plant", "Split-leaf Philodendron"],
          "family": "Araceae",
          "genus": "Monstera",
          "difficulty": "easy",
          "toxicity": "Toxic to pets and children if ingested",
          "lightRequirement": "Bright indirect light",
          "waterFrequency": "Water when top 2 inches of soil are dry (typically every 7-10 days)",
          "humidityLevel": "Medium to high (50-70%)",
          "temperature": "65-85°F (18-29°C)",
          "description": "A popular tropical houseplant known for its large, fenestrated leaves..."
        }
      }
    ]
  }
}
```

**Response (Low Confidence)**:

```json
{
  "success": true,
  "data": {
    "identificationId": "uuid",
    "photoUrl": "https://...",
    "thumbnailUrl": "https://...",
    "isLowConfidence": true,
    "matches": [
      {
        "confidence": 0.65,
        "species": { ... }
      },
      {
        "confidence": 0.58,
        "species": { ... }
      },
      {
        "confidence": 0.52,
        "species": { ... }
      }
    ]
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid image format or size
- `401 Unauthorized`: Missing or invalid authentication token
- `429 Too Many Requests`: Rate limit exceeded (10 identifications per hour for free tier)
- `503 Service Unavailable`: Plant.id API is down (fallback to Gemini Vision API)

**Performance Requirements**:

- P95 response time: < 5 seconds
- P99 response time: < 8 seconds
- Concurrent request handling: 100+ simultaneous users
- Rate limiting: 10 requests/hour (free), 100 requests/hour (premium)

---

### FR-2: Save Plant to Collection Endpoint

**Endpoint**: `POST /api/v1/plants`

**Authentication**: Required (JWT Bearer token)

**Request**:

```json
{
  "speciesId": "uuid",
  "identificationId": "uuid",
  "nickname": "Monstera in Living Room",
  "locationInHome": "Living room, east-facing window",
  "lightExposure": "bright",
  "acquiredDate": "2024-12-15T00:00:00Z",
  "acquisitionMethod": "purchased",
  "notes": "Bought from local nursery"
}
```

**Request Validation**:

1. `speciesId` is required and must exist in Species table
2. `identificationId` is optional (if user is manually adding plant)
3. `nickname` is optional (max 100 characters)
4. `locationInHome` is required (max 200 characters)
5. `lightExposure` must be one of: `low`, `medium`, `bright`, `direct`
6. `acquiredDate` is optional (defaults to current date)
7. `acquisitionMethod` must be one of: `purchased`, `propagated`, `gifted`, `unknown`

**Processing Logic**:

1. Validate user authentication
2. Verify speciesId exists in database
3. Generate default nickname if not provided: "{commonName} {count+1}"
   - Example: User has 2 Peace Lilies → Default: "Peace Lily 3"
4. Fetch species care requirements from Species table
5. Calculate default watering schedule:
   - Parse `waterFrequency` to extract days (e.g., "every 7-10 days" → 7)
   - Set `wateringFrequencyDays` to extracted value
   - Calculate `nextWaterDue` = current date + wateringFrequencyDays
6. Create Plant record with:
   - `userId` from JWT token
   - `speciesId` from request
   - `nickname` from request or generated default
   - `locationInHome` from request
   - `lightExposure` from request
   - `currentHealth` = 'healthy' (default for new plants)
   - `wateringFrequencyDays` calculated from species
   - `nextWaterDue` calculated from current date
   - `acquiredDate` from request or current date
   - `acquisitionMethod` from request
7. If `identificationId` provided:
   - Update PlantPhoto record to link to new plant
   - Set PlantPhoto.plantId to new plant's ID
8. Return complete plant record with species details

**Response**:

```json
{
  "success": true,
  "data": {
    "plant": {
      "id": "uuid",
      "userId": "uuid",
      "nickname": "Monstera in Living Room",
      "locationInHome": "Living room, east-facing window",
      "lightExposure": "bright",
      "currentHealth": "healthy",
      "wateringFrequencyDays": 7,
      "lastWatered": null,
      "nextWaterDue": "2024-12-22T00:00:00Z",
      "acquiredDate": "2024-12-15T00:00:00Z",
      "acquisitionMethod": "purchased",
      "createdAt": "2024-12-15T10:30:00Z",
      "species": {
        "id": "uuid",
        "scientificName": "Monstera deliciosa",
        "commonNames": ["Swiss Cheese Plant"],
        "family": "Araceae",
        "lightRequirement": "Bright indirect light",
        "waterFrequency": "Water when top 2 inches of soil are dry (typically every 7-10 days)",
        "difficulty": "easy"
      },
      "photos": [
        {
          "id": "uuid",
          "storageUrl": "https://...",
          "thumbnailUrl": "https://...",
          "type": "identification",
          "takenAt": "2024-12-15T10:25:00Z"
        }
      ]
    }
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid request data or validation failure
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Species ID does not exist
- `409 Conflict`: Duplicate nickname for same user (optional constraint)
- `500 Internal Server Error`: Database error

**Business Rules**:

1. One user can have unlimited plants (no restriction)
2. Multiple plants can share the same speciesId (same species, different instances)
3. Nicknames must be unique per user (to avoid confusion) - OPTIONAL: Can be relaxed if location differentiates
4. New plants default to `currentHealth = 'healthy'`
5. Watering schedule auto-calculates from species data
6. Plants without identification photos are allowed (manual entry)

---

### FR-3: Species Deduplication

**Requirement**: Prevent duplicate species entries in the database when multiple users identify the same plant.

**Logic**:

1. When Plant.id returns identification, search Species table by `scientificName`
2. If species exists: Use existing species record
3. If species does not exist: Create new species record with all data from Plant.id
4. Normalize scientific names (lowercase, trim whitespace) for comparison
5. Update existing species records if Plant.id returns more complete data

**Example**:

```
User A identifies "Monstera deliciosa" → Species created (ID: abc-123)
User B identifies "Monstera deliciosa" → Species abc-123 is reused
User A and B both have plants linked to same species record
```

---

### FR-4: Error Handling & Fallbacks

**Plant.id API Failures**:

1. **Timeout (>10 seconds)**:
   - Fallback to Gemini Vision API for identification
   - Log warning: "Plant.id timeout, using Gemini fallback"
   - Return results from Gemini with lower confidence scores

2. **Rate Limit Exceeded**:
   - Return `429 Too Many Requests`
   - Include header: `Retry-After: 3600`
   - Suggest user upgrade to premium tier

3. **Invalid API Key**:
   - Log critical error
   - Return `503 Service Unavailable`
   - Alert engineering team via monitoring

4. **Image Processing Error**:
   - Return `400 Bad Request` with specific error
   - Message: "Unable to process image. Please ensure the plant is clearly visible and the image is in focus."

**Database Failures**:

- Implement retry logic (3 attempts with exponential backoff)
- If all retries fail, return `500 Internal Server Error`
- Log full error details for debugging

**Image Upload Failures**:

- If Supabase Storage fails, retry 2 times
- If still failing, return `503 Service Unavailable`
- Do not proceed with identification if image upload fails

## Non-Goals (Out of Scope)

The following features are explicitly **NOT** included in this release:

1. **UI Implementation**: This PRD covers API endpoints only. Mobile/web UI is handled separately.

2. **Batch Upload**: Users cannot upload multiple plant images in a single request. Each identification is individual.

3. **Offline Identification**: Plant identification requires internet connectivity. No offline model.

4. **Plant Health Diagnosis**: This PRD focuses on species identification. Health diagnosis is a separate feature (covered in different PRD).

5. **Social Features**: No sharing identifications, no community verification, no social comments on plants.

6. **Advanced Image Editing**: No in-app cropping, filtering, or enhancement. Users must upload final image.

7. **Species Management by Users**: Users cannot edit or add species to the catalog. Species data comes only from Plant.id API.

8. **Historical Identification Log**: Not tracking all identification attempts per user. Only successful saves create records.

9. **Plant Care Automation**: No automatic watering reminders or health alerts in this feature. Those are separate modules.

10. **Multi-language Support**: Initial release is English only. Internationalization comes later.

## Design Considerations

### API Design Patterns

- **RESTful Conventions**: Follow REST principles with resource-based URLs
- **JSON Responses**: All responses in JSON format with consistent structure
- **Error Format**: Standardized error responses matching NestJS HttpException format
- **Versioning**: API versioned as `/api/v1/` to allow future changes

### Request/Response Format

**Success Response Structure**:

```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response Structure**:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_IMAGE_FORMAT",
    "message": "Image must be JPEG, PNG, or HEIC format",
    "timestamp": "2024-12-15T10:30:00Z",
    "path": "/api/v1/identification/identify"
  }
}
```

### Image Handling

- **Supported Formats**: JPEG, PNG, HEIC
- **Max Size**: 10MB per image
- **Recommended Resolution**: 1024x1024px or higher for best accuracy
- **Compression**: Automatically compress images >5MB to reduce upload time
- **Storage Path**: `/plant-photos/{userId}/{timestamp}-{type}.jpg`
- **Thumbnails**: Auto-generate 300x300px thumbnails for fast loading

## Technical Considerations

### Architecture

Follow NestJS module pattern as defined in `CLAUDE.md`:

**Module Structure**:

```
src/modules/identification/
├── identification.module.ts
├── identification.controller.ts
├── identification.service.ts
├── dto/
│   ├── identify-plant.dto.ts
│   ├── identification-response.dto.ts
└── entities/
    └── identification-result.entity.ts

src/modules/plants/
├── plants.module.ts
├── plants.controller.ts
├── plants.service.ts
├── plants.repository.ts
├── dto/
│   ├── create-plant.dto.ts
│   ├── update-plant.dto.ts
│   └── plant-response.dto.ts
```

### Plant.id API Integration

**Provider Class**: `src/providers/ai/plant-id.provider.ts`

```typescript
@Injectable()
export class PlantIdProvider {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.plant.id/v3';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get('PLANT_ID_API_KEY');
  }

  async identify(imageBase64: string): Promise<IdentificationResult> {
    // Implement with retry logic (3 attempts, exponential backoff)
    // Handle rate limiting, timeouts, and errors
    // Return typed IdentificationResult with species array
  }
}
```

**Retry Logic**:

- 3 attempts maximum
- Exponential backoff: 1s, 2s, 4s
- Log each retry attempt
- Fail gracefully with fallback to Gemini Vision

**Fallback Strategy**:

```typescript
async identifyWithFallback(image: string): Promise<IdentificationResult> {
  try {
    return await this.plantIdProvider.identify(image);
  } catch (error) {
    this.logger.warn('Plant.id failed, falling back to Gemini Vision', error);
    return await this.geminiProvider.identifyPlant(image);
  }
}
```

### Database Operations

**Prisma Service Usage**:

```typescript
@Injectable()
export class PlantsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlant(userId: string, dto: CreatePlantDto) {
    // Use Prisma transaction for atomicity
    return this.prisma.client.$transaction(async (tx) => {
      const species = await tx.species.findUnique({
        where: { id: dto.speciesId },
      });

      const plant = await tx.plant.create({
        data: {
          userId,
          speciesId: dto.speciesId,
          nickname: dto.nickname || this.generateDefaultNickname(species),
          locationInHome: dto.locationInHome,
          currentHealth: 'healthy',
          wateringFrequencyDays: this.extractWateringDays(species),
          nextWaterDue: this.calculateNextWatering(species),
          // ... other fields
        },
        include: {
          species: true,
          photos: true,
        },
      });

      // Link identification photo if provided
      if (dto.identificationId) {
        await tx.plantPhoto.update({
          where: { id: dto.identificationId },
          data: { plantId: plant.id },
        });
      }

      return plant;
    });
  }
}
```

### Image Storage (Supabase)

**Storage Service**: `src/providers/storage/storage.service.ts`

```typescript
@Injectable()
export class StorageService {
  async uploadPlantPhoto(
    userId: string,
    imageBase64: string,
    type: 'identification' | 'health' | 'progress',
  ): Promise<{ url: string; thumbnailUrl: string }> {
    const timestamp = Date.now();
    const path = `plant-photos/${userId}/${timestamp}-${type}.jpg`;

    // Upload original
    const { data: upload } = await this.supabase.storage
      .from('plants')
      .upload(path, this.base64ToBuffer(imageBase64));

    // Generate thumbnail
    const thumbnailUrl = await this.generateThumbnail(upload.path);

    return {
      url: this.getPublicUrl(upload.path),
      thumbnailUrl,
    };
  }
}
```

### Authentication & Authorization

- **All endpoints require JWT authentication**
- Use `@UseGuards(JwtAuthGuard)` decorator
- Extract userId from token via `@CurrentUser('id')` decorator
- No role-based access control needed (all authenticated users have same permissions)

### Rate Limiting

**Free Tier**:

- 10 identifications per hour per user
- 50 plant saves per day per user

**Premium Tier**:

- 100 identifications per hour per user
- Unlimited plant saves

Implement using `@nestjs/throttler`:

```typescript
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Throttle(10, 3600) // 10 requests per hour
@Post('identify')
async identify() { ... }
```

### Monitoring & Logging

**Key Metrics to Track**:

- Identification request count
- Average identification time
- Plant.id success rate
- Gemini fallback usage rate
- Plant save completion rate
- Most identified species

**Logging Requirements**:

- Log all Plant.id API calls (success, failure, response time)
- Log all image uploads (size, format, duration)
- Log species deduplication events
- Log identification-to-save conversion rate

### Performance Optimization

1. **Database Indexes**:
   - Index on `species.scientificName` for fast lookup
   - Index on `plants.userId` for user's plant list
   - Index on `plants.nextWaterDue` for reminder queries

2. **Caching** (Future Enhancement):
   - Cache species data (rarely changes)
   - Cache user's plant list (invalidate on create/update)

3. **Serverless Considerations**:
   - Lazy-load Plant.id SDK to reduce cold start time
   - Use connection pooling for Prisma (Supabase)
   - Implement timeout (10s) on Plant.id calls

## Success Metrics

### Primary Metrics (P0)

1. **Identification Accuracy**:
   - Target: >85% of identifications have confidence >70%
   - Measurement: Average confidence score across all identifications

2. **Identification-to-Save Conversion Rate**:
   - Target: >60% of successful identifications result in saved plants
   - Measurement: (# plants saved) / (# successful identifications)

3. **API Response Time**:
   - Target: P95 < 5 seconds for identification endpoint
   - Measurement: Latency tracking via monitoring tools

4. **API Success Rate**:
   - Target: >99% uptime for identification endpoint
   - Measurement: (# successful requests) / (# total requests)

### Secondary Metrics (P1)

5. **Fallback Usage Rate**:
   - Target: <5% of requests use Gemini fallback
   - Measurement: % of identifications using fallback vs. Plant.id

6. **Multi-Instance Adoption**:
   - Target: >20% of users have multiple plants of same species
   - Measurement: % of users with duplicate speciesIds in their collection

7. **Plant Collection Size**:
   - Target: Average 5+ plants per active user
   - Measurement: Average plants per user who saved at least 1 plant

8. **Species Catalog Growth**:
   - Target: 500+ unique species identified in first month
   - Measurement: COUNT(DISTINCT species.id)

### User Experience Metrics

9. **Time to First Save**:
   - Target: <2 minutes from app open to plant saved
   - Measurement: Time between auth and first plant creation

10. **Low Confidence Handling**:
    - Target: >40% of low-confidence identifications still result in saves
    - Measurement: Save rate for identifications with confidence <70%

## Open Questions

1. **Species Data Completeness**: What happens if Plant.id returns incomplete species data (e.g., missing care requirements)? Should we:
   - a) Save species anyway with NULL fields
   - b) Fetch additional data from another source (Perenual API)
   - c) Mark species as "incomplete" and prevent saving

2. **Photo Retention**: How long should we store identification photos that are never linked to saved plants?
   - Current assumption: 24 hours, then delete
   - Confirm with product team

3. **Nickname Uniqueness**: Should nicknames be enforced as unique per user?
   - Pro: Prevents user confusion
   - Con: Users might want same nickname if differentiated by location
   - Recommendation needed

4. **Watering Schedule Calculation**: Species.waterFrequency is a free-text string (e.g., "every 7-10 days"). Should we:
   - a) Parse with regex (brittle but fast)
   - b) Use LLM to extract number (accurate but slow/expensive)
   - c) Default to 7 days if parsing fails

5. **Species Updates**: If Plant.id updates their species data, should we:
   - a) Update existing Species records automatically
   - b) Create new version and migrate plants
   - c) Leave existing records unchanged

6. **Premium Feature Gating**: Should identification be limited for free users beyond rate limiting?
   - Option A: Free = 10/hour, Premium = unlimited
   - Option B: Free = basic identification, Premium = high-resolution + health diagnosis
   - Option C: All identification features free, premium gets other benefits

7. **Error UX for Low Confidence**: When returning multiple matches (low confidence), should the API include suggested user actions?
   - e.g., "Try taking a photo with better lighting" or "Focus on the leaves"

---

**Document Version**: 1.0  
**Created**: December 15, 2024  
**Author**: Product Team  
**Target Audience**: Engineering Team (Backend Developers)

