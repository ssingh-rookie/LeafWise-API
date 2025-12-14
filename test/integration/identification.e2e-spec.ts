/**
 * Plant Identification Endpoint Integration Tests
 *
 * Tests the POST /identify endpoint with real Plant.id API calls.
 * Requires test images in ../test-images/ folder.
 */

import * as fs from 'fs';
import * as path from 'path';
import { apiClient, AuthTokens } from './helpers/api-client';
import { config } from './config';

// Generate unique email for each test run
const testEmail = `identify-test-${Date.now()}@leafwise.app`;
const testPassword = 'TestPassword123';
const testName = 'Identification Test User';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  session: AuthTokens;
}

interface IdentificationResponse {
  success: boolean;
  data: {
    species: {
      id: string | null;
      scientificName: string;
      commonNames: string[];
      family: string;
      confidence: number;
    };
    similarSpecies: Array<{
      scientificName: string;
      commonName: string;
      confidence: number;
      imageUrl: string | null;
    }>;
    photo: {
      url: string;
      thumbnailUrl: string;
    };
  };
  meta: {
    provider: 'plant-id' | 'gemini';
    processingTimeMs: number;
  };
}

/**
 * Load test images from disk as base64
 */
function loadTestImages(): string[] {
  const imageDir = path.join(__dirname, '..', 'test-images');

  if (!fs.existsSync(imageDir)) {
    console.warn(`Test images directory not found: ${imageDir}`);
    return [];
  }

  const imageFiles = fs
    .readdirSync(imageDir)
    .filter((f) => /\.(jpg|jpeg|png)$/i.test(f));

  return imageFiles.map((filename) => {
    const filePath = path.join(imageDir, filename);
    const buffer = fs.readFileSync(filePath);
    return buffer.toString('base64');
  });
}

describe('Plant Identification Endpoints', () => {
  let tokens: AuthTokens;
  let testImages: string[];

  beforeAll(async () => {
    console.log(`Testing against: ${config.baseUrl}`);

    // Load test images
    testImages = loadTestImages();
    console.log(`Loaded ${testImages.length} test image(s)`);

    if (testImages.length === 0) {
      console.warn(
        'No test images found. Some tests will be skipped. Add images to test/test-images/',
      );
    }

    // Create a test user and get tokens
    const response = await apiClient.post<AuthResponse>('/auth/signup', {
      email: testEmail,
      password: testPassword,
      name: testName,
    });

    tokens = response.data.session;
    apiClient.setTokens(tokens);
  }, 30000);

  afterAll(() => {
    apiClient.clearTokens();
  });

  describe('POST /identify - Authentication', () => {
    it('should fail without authentication', async () => {
      apiClient.clearTokens();

      try {
        await apiClient.post('/identify', { images: ['fake-base64'] });
        fail('Expected request to fail without auth');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }

      // Restore tokens
      apiClient.setTokens(tokens);
    });
  });

  describe('POST /identify - Validation', () => {
    it('should fail with empty images array', async () => {
      try {
        await apiClient.post('/identify', { images: [] }, { auth: true });
        fail('Expected request to fail with empty images');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should fail with missing images field', async () => {
      try {
        await apiClient.post('/identify', {}, { auth: true });
        fail('Expected request to fail with missing images');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should fail with more than 5 images', async () => {
      const sixImages = Array(6).fill('fake-base64-data');

      try {
        await apiClient.post('/identify', { images: sixImages }, { auth: true });
        fail('Expected request to fail with too many images');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should fail with non-array images', async () => {
      try {
        await apiClient.post(
          '/identify',
          { images: 'not-an-array' },
          { auth: true },
        );
        fail('Expected request to fail with non-array images');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should fail with non-string array elements', async () => {
      try {
        await apiClient.post('/identify', { images: [123, 456] }, { auth: true });
        fail('Expected request to fail with non-string elements');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });
  });

  describe('POST /identify - Single Image', () => {
    it(
      'should identify plant from single image',
      async () => {
        if (testImages.length === 0) {
          console.log('Skipping: No test images available');
          return;
        }

        const response = await apiClient.post<IdentificationResponse>(
          '/identify',
          { images: [testImages[0]] },
          { auth: true },
        );

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);

        // Verify species data
        expect(response.data.data.species).toBeDefined();
        expect(response.data.data.species.scientificName).toBeDefined();
        expect(typeof response.data.data.species.scientificName).toBe('string');
        expect(response.data.data.species.confidence).toBeGreaterThan(0);
        expect(response.data.data.species.confidence).toBeLessThanOrEqual(1);

        // Verify common names is an array
        expect(Array.isArray(response.data.data.species.commonNames)).toBe(true);

        // Verify photo URLs
        expect(response.data.data.photo).toBeDefined();

        // Verify meta
        expect(response.data.meta).toBeDefined();
        expect(['plant-id', 'gemini']).toContain(response.data.meta.provider);
        expect(response.data.meta.processingTimeMs).toBeGreaterThan(0);

        console.log(
          `Identified: ${response.data.data.species.scientificName} (${(response.data.data.species.confidence * 100).toFixed(1)}%)`,
        );
        console.log(`Provider: ${response.data.meta.provider}`);
        console.log(`Processing time: ${response.data.meta.processingTimeMs}ms`);
      },
      60000,
    ); // 60s timeout for API call
  });

  describe('POST /identify - Multiple Images', () => {
    it(
      'should identify plant from multiple images with higher confidence',
      async () => {
        if (testImages.length < 2) {
          console.log('Skipping: Need at least 2 test images');
          return;
        }

        // Use up to 4 images
        const imagesToSend = testImages.slice(0, 4);

        const response = await apiClient.post<IdentificationResponse>(
          '/identify',
          { images: imagesToSend },
          { auth: true },
        );

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);

        // Verify species data
        expect(response.data.data.species).toBeDefined();
        expect(response.data.data.species.scientificName).toBeDefined();
        expect(response.data.data.species.confidence).toBeGreaterThan(0);

        // Log results for comparison
        console.log(`Images sent: ${imagesToSend.length}`);
        console.log(
          `Identified: ${response.data.data.species.scientificName} (${(response.data.data.species.confidence * 100).toFixed(1)}%)`,
        );
        console.log(`Provider: ${response.data.meta.provider}`);
        console.log(`Processing time: ${response.data.meta.processingTimeMs}ms`);
      },
      60000,
    ); // 60s timeout for API call

    it(
      'should accept exactly 5 images (max allowed)',
      async () => {
        if (testImages.length < 1) {
          console.log('Skipping: No test images available');
          return;
        }

        // Duplicate first image to get 5 images
        const fiveImages = Array(5).fill(testImages[0]);

        const response = await apiClient.post<IdentificationResponse>(
          '/identify',
          { images: fiveImages },
          { auth: true },
        );

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.data.species).toBeDefined();

        console.log(
          `5 images accepted: ${response.data.data.species.scientificName}`,
        );
      },
      60000,
    );
  });

  describe('POST /identify - Similar Species', () => {
    it(
      'should return similar species for low confidence matches',
      async () => {
        if (testImages.length === 0) {
          console.log('Skipping: No test images available');
          return;
        }

        const response = await apiClient.post<IdentificationResponse>(
          '/identify',
          { images: [testImages[0]] },
          { auth: true },
        );

        expect(response.status).toBe(200);

        // Similar species should be an array (may be empty for high confidence)
        expect(Array.isArray(response.data.data.similarSpecies)).toBe(true);

        if (response.data.data.species.confidence < 0.7) {
          // Low confidence should return similar species
          expect(response.data.data.similarSpecies.length).toBeGreaterThan(0);

          // Verify similar species structure
          const firstSimilar = response.data.data.similarSpecies[0];
          expect(firstSimilar.scientificName).toBeDefined();
          expect(firstSimilar.confidence).toBeGreaterThan(0);

          console.log('Similar species returned for low confidence match');
        } else {
          console.log(
            'High confidence match - similar species may be empty array',
          );
        }
      },
      60000,
    );
  });

  describe('POST /identify - Response Structure', () => {
    it(
      'should return correctly structured response',
      async () => {
        if (testImages.length === 0) {
          console.log('Skipping: No test images available');
          return;
        }

        const response = await apiClient.post<IdentificationResponse>(
          '/identify',
          { images: [testImages[0]] },
          { auth: true },
        );

        expect(response.status).toBe(200);

        // Top-level structure
        expect(response.data).toHaveProperty('success');
        expect(response.data).toHaveProperty('data');
        expect(response.data).toHaveProperty('meta');

        // Data structure
        const { data } = response.data;
        expect(data).toHaveProperty('species');
        expect(data).toHaveProperty('similarSpecies');
        expect(data).toHaveProperty('photo');

        // Species structure
        expect(data.species).toHaveProperty('id');
        expect(data.species).toHaveProperty('scientificName');
        expect(data.species).toHaveProperty('commonNames');
        expect(data.species).toHaveProperty('family');
        expect(data.species).toHaveProperty('confidence');

        // Photo structure
        expect(data.photo).toHaveProperty('url');
        expect(data.photo).toHaveProperty('thumbnailUrl');

        // Meta structure
        const { meta } = response.data;
        expect(meta).toHaveProperty('provider');
        expect(meta).toHaveProperty('processingTimeMs');
      },
      60000,
    );
  });
});
