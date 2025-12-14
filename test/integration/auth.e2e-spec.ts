/**
 * Authentication Endpoint Integration Tests
 */

import { apiClient, AuthTokens } from './helpers/api-client';
import { config } from './config';

// Generate unique email for each test run
const testEmail = `test-${Date.now()}@leafwise.app`;
const testPassword = 'TestPassword123';
const testName = 'Integration Test User';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
  session: AuthTokens;
}

interface RefreshResponse {
  session: AuthTokens;
}

describe('Authentication Endpoints', () => {
  let tokens: AuthTokens;

  beforeAll(() => {
    console.log(`Testing against: ${config.baseUrl}`);
    console.log(`Test email: ${testEmail}`);
  });

  describe('POST /auth/signup', () => {
    it('should create a new user and return tokens', async () => {
      const response = await apiClient.post<AuthResponse>('/auth/signup', {
        email: testEmail,
        password: testPassword,
        name: testName,
      });

      expect(response.status).toBe(201);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe(testEmail);
      expect(response.data.user.name).toBe(testName);
      expect(response.data.session).toBeDefined();
      expect(response.data.session.accessToken).toBeDefined();
      expect(response.data.session.refreshToken).toBeDefined();

      // Store tokens for later tests
      tokens = response.data.session;
    });

    it('should fail with duplicate email', async () => {
      try {
        await apiClient.post('/auth/signup', {
          email: testEmail,
          password: testPassword,
          name: testName,
        });
        fail('Expected signup to fail with duplicate email');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    it('should fail with invalid email format', async () => {
      try {
        await apiClient.post('/auth/signup', {
          email: 'invalid-email',
          password: testPassword,
          name: testName,
        });
        fail('Expected signup to fail with invalid email');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });

    it('should fail with short password', async () => {
      try {
        await apiClient.post('/auth/signup', {
          email: `short-${Date.now()}@leafwise.app`,
          password: '123',
          name: testName,
        });
        fail('Expected signup to fail with short password');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email: testEmail,
        password: testPassword,
      });

      expect(response.status).toBe(200);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe(testEmail);
      expect(response.data.session).toBeDefined();
      expect(response.data.session.accessToken).toBeDefined();
      expect(response.data.session.refreshToken).toBeDefined();

      // Update tokens
      tokens = response.data.session;
    });

    it('should fail with invalid password', async () => {
      try {
        await apiClient.post('/auth/login', {
          email: testEmail,
          password: 'wrongpassword',
        });
        fail('Expected login to fail with invalid password');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    it('should fail with non-existent email', async () => {
      try {
        await apiClient.post('/auth/login', {
          email: 'nonexistent@leafwise.app',
          password: testPassword,
        });
        fail('Expected login to fail with non-existent email');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      expect(tokens).toBeDefined();

      const response = await apiClient.post<RefreshResponse>('/auth/refresh', {
        refreshToken: tokens.refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.data.session).toBeDefined();
      expect(response.data.session.accessToken).toBeDefined();
      expect(response.data.session.refreshToken).toBeDefined();
      expect(response.data.session.accessToken).not.toBe(tokens.accessToken);
    });

    it('should fail with invalid refresh token', async () => {
      try {
        await apiClient.post('/auth/refresh', {
          refreshToken: 'invalid-token',
        });
        fail('Expected refresh to fail with invalid token');
      } catch (error: any) {
        expect(error.status).toBe(401);
      }
    });

    it('should fail with missing refresh token', async () => {
      try {
        await apiClient.post('/auth/refresh', {});
        fail('Expected refresh to fail with missing token');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });
  });
});
