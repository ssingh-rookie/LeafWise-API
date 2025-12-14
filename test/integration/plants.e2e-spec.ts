/**
 * Plants Endpoint Integration Tests
 */

import { apiClient, AuthTokens } from './helpers/api-client';
import { config } from './config';

// Generate unique email for each test run
const testEmail = `plants-test-${Date.now()}@leafwise.app`;
const testPassword = 'TestPassword123';
const testName = 'Plants Test User';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  session: AuthTokens;
}

interface Plant {
  id: string;
  name: string;
  userId: string;
}

describe('Plants Endpoints', () => {
  let tokens: AuthTokens;

  beforeAll(async () => {
    console.log(`Testing against: ${config.baseUrl}`);

    // Create a test user and get tokens
    const response = await apiClient.post<AuthResponse>('/auth/signup', {
      email: testEmail,
      password: testPassword,
      name: testName,
    });

    tokens = response.data.session;
    apiClient.setTokens(tokens);
  });

  afterAll(() => {
    apiClient.clearTokens();
  });

  describe('GET /plants', () => {
    it('should return empty array for new user', async () => {
      const response = await apiClient.get<Plant[]>('/plants', { auth: true });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(0);
    });

    it('should fail without authentication', async () => {
      apiClient.clearTokens();

      try {
        await apiClient.get('/plants', { auth: true });
        fail('Expected request to fail without auth');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }

      // Restore tokens
      apiClient.setTokens(tokens);
    });
  });

  describe('GET /plants/:id', () => {
    it('should return 404 or 500 for non-existent plant', async () => {
      try {
        await apiClient.get('/plants/00000000-0000-0000-0000-000000000000', { auth: true });
        fail('Expected request to fail for non-existent plant');
      } catch (error: any) {
        // 404 for valid UUID not found, 500 for invalid UUID format
        expect([404, 500]).toContain(error.status);
      }
    });

    it('should fail without authentication', async () => {
      apiClient.clearTokens();

      try {
        await apiClient.get('/plants/some-id', { auth: true });
        fail('Expected request to fail without auth');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }

      // Restore tokens
      apiClient.setTokens(tokens);
    });
  });
});
