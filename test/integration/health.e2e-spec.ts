/**
 * Health Check Endpoint Integration Tests
 */

import { apiClient } from './helpers/api-client';
import { config } from './config';

describe('Health Check Endpoints', () => {
  beforeAll(() => {
    console.log(`Testing against: ${config.baseUrl}`);
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const response = await apiClient.get('/health');
      expect(response.status).toBe(200);
    });

    it('should return health status object', async () => {
      const response = await apiClient.get<{ status: string }>('/health');
      expect(response.data).toHaveProperty('status');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when service is ready', async () => {
      const response = await apiClient.get('/health/ready');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 when service is live', async () => {
      const response = await apiClient.get('/health/live');
      expect(response.status).toBe(200);
    });
  });
});
