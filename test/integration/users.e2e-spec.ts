/**
 * Users Endpoint Integration Tests
 */

import { apiClient, AuthTokens } from './helpers/api-client';
import { config } from './config';

// Generate unique email for each test run
const testEmail = `user-test-${Date.now()}@leafwise.app`;
const testPassword = 'TestPassword123';
const testName = 'User Test User';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthResponse {
  user: User;
  session: AuthTokens;
}

describe('Users Endpoints', () => {
  let tokens: AuthTokens;
  let userId: string;

  beforeAll(async () => {
    console.log(`Testing against: ${config.baseUrl}`);

    // Create a test user and get tokens
    const response = await apiClient.post<AuthResponse>('/auth/signup', {
      email: testEmail,
      password: testPassword,
      name: testName,
    });

    tokens = response.data.session;
    userId = response.data.user.id;
    apiClient.setTokens(tokens);
  });

  afterAll(() => {
    apiClient.clearTokens();
  });

  describe('GET /users/me', () => {
    it('should return current user when authenticated', async () => {
      const response = await apiClient.get<User>('/users/me', { auth: true });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(userId);
      expect(response.data.email).toBe(testEmail);
      expect(response.data.name).toBe(testName);
    });

    it('should fail without authentication', async () => {
      apiClient.clearTokens();

      try {
        await apiClient.get('/users/me', { auth: true });
        fail('Expected request to fail without auth');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }

      // Restore tokens for other tests
      apiClient.setTokens(tokens);
    });

    it('should fail with invalid token', async () => {
      apiClient.setTokens({
        ...tokens,
        accessToken: 'invalid-token',
      });

      try {
        await apiClient.get('/users/me', { auth: true });
        fail('Expected request to fail with invalid token');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }

      // Restore valid tokens
      apiClient.setTokens(tokens);
    });
  });
});
