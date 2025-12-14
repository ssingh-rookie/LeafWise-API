/**
 * Plant Identification Preview Environment Tests
 *
 * Tests the POST /identify endpoint against Vercel preview deployments.
 * Uses an existing test user (login) instead of creating new users.
 *
 * Usage:
 *   API_BASE_URL=https://preview.vercel.app TEST_USER_PASSWORD=secret pnpm test:preview
 */

import * as fs from 'fs';
import * as path from 'path';
import { previewApiClient, AuthTokens } from './api-client';
import { previewConfig } from './config';

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
  const imageDir = path.join(__dirname, '..', '..', 'test-images');

  if (!fs.existsSync(imageDir)) {
    console.warn(`Test images directory not found: ${imageDir}`);
    return [];
  }

  const imageFiles = fs.readdirSync(imageDir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f));

  return imageFiles.map((filename) => {
    const filePath = path.join(imageDir, filename);
    const buffer = fs.readFileSync(filePath);
    return buffer.toString('base64');
  });
}

describe('Preview: Plant Identification Endpoints', () => {
  let tokens: AuthTokens;
  let testImages: string[];

  beforeAll(async () => {
    console.log(`\n========================================`);
    console.log(`Preview Environment Tests`);
    console.log(`========================================`);
    console.log(`API URL: ${previewConfig.baseUrl}`);
    console.log(`Test User: ${previewConfig.testUser.email}`);
    console.log(`========================================\n`);

    // Load test images
    testImages = loadTestImages();
    console.log(`Loaded ${testImages.length} test image(s)`);

    if (testImages.length === 0) {
      console.warn(
        'No test images found. Some tests will be skipped. Add images to test/test-images/',
      );
    }

    // Login with existing test user
    console.log(`Authenticating as ${previewConfig.testUser.email}...`);

    try {
      const response = await previewApiClient.post<AuthResponse>('/auth/login', {
        email: previewConfig.testUser.email,
        password: previewConfig.testUser.password,
      });

      tokens = response.data.session;
      previewApiClient.setTokens(tokens);
      console.log(`Authentication successful!`);
    } catch (error: any) {
      console.error(`Authentication failed: ${error.message || error.status}`);
      throw new Error(
        `Failed to login with test user ${previewConfig.testUser.email}. ` +
          `Make sure the user exists and password is correct.`,
      );
    }
  }, 60000);

  afterAll(() => {
    previewApiClient.clearTokens();
  });

  describe('POST /identify - Authentication', () => {
    it('should fail without authentication', async () => {
      previewApiClient.clearTokens();

      try {
        await previewApiClient.post('/identify', { images: ['fake-base64'] });
        fail('Expected request to fail without auth');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }

      // Restore tokens
      previewApiClient.setTokens(tokens);
    });
  });

  describe('POST /identify - Validation', () => {
    it('should fail with empty images array', async () => {
      try {
        await previewApiClient.post('/identify', { images: [] }, { auth: true });
        fail('Expected request to fail with empty images');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should fail with missing images field', async () => {
      try {
        await previewApiClient.post('/identify', {}, { auth: true });
        fail('Expected request to fail with missing images');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should fail with more than 5 images', async () => {
      const sixImages = Array(6).fill('fake-base64-data');

      try {
        await previewApiClient.post('/identify', { images: sixImages }, { auth: true });
        fail('Expected request to fail with too many images');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should fail with non-array images', async () => {
      try {
        await previewApiClient.post('/identify', { images: 'not-an-array' }, { auth: true });
        fail('Expected request to fail with non-array images');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should fail with non-string array elements', async () => {
      try {
        await previewApiClient.post('/identify', { images: [123, 456] }, { auth: true });
        fail('Expected request to fail with non-string elements');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });
  });

  describe('POST /identify - Single Image', () => {
    it('should identify plant from single image', async () => {
      if (testImages.length === 0) {
        console.log('Skipping: No test images available');
        return;
      }

      const response = await previewApiClient.post<IdentificationResponse>(
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
    }, 120000); // 120s timeout for cold starts
  });

  describe('POST /identify - Multiple Images', () => {
    it('should identify plant from multiple images with higher confidence', async () => {
      if (testImages.length < 2) {
        console.log('Skipping: Need at least 2 test images');
        return;
      }

      // Use up to 4 images
      const imagesToSend = testImages.slice(0, 4);

      const response = await previewApiClient.post<IdentificationResponse>(
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
    }, 120000);

    it('should accept exactly 5 images (max allowed)', async () => {
      if (testImages.length < 1) {
        console.log('Skipping: No test images available');
        return;
      }

      // Duplicate first image to get 5 images
      const fiveImages = Array(5).fill(testImages[0]);

      const response = await previewApiClient.post<IdentificationResponse>(
        '/identify',
        { images: fiveImages },
        { auth: true },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.species).toBeDefined();

      console.log(`5 images accepted: ${response.data.data.species.scientificName}`);
    }, 120000);
  });

  describe('POST /identify - Response Structure', () => {
    it('should return correctly structured response', async () => {
      if (testImages.length === 0) {
        console.log('Skipping: No test images available');
        return;
      }

      const response = await previewApiClient.post<IdentificationResponse>(
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
    }, 120000);
  });
});
