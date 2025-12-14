/**
 * Integration Test Configuration
 *
 * Configure via environment variables:
 * - API_BASE_URL: Base URL for API (default: http://localhost:3000)
 *
 * Usage:
 *   API_BASE_URL=http://localhost:3000 pnpm test:integration
 *   API_BASE_URL=https://staging.leafwise.app pnpm test:integration
 */

export interface TestConfig {
  baseUrl: string;
  apiPrefix: string;
  timeout: number;
  debug: boolean;
}

export const config: TestConfig = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  apiPrefix: '/api/v1',
  timeout: 30000, // 30 seconds
  debug: process.env.DEBUG === 'true',
};

export const getApiUrl = (path: string): string => {
  return `${config.baseUrl}${config.apiPrefix}${path}`;
};
