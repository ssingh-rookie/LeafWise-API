/**
 * Preview Environment Integration Test Configuration
 *
 * This configuration is for testing against Vercel preview deployments
 * using an existing test user instead of creating new users.
 *
 * Configure via environment variables:
 * - API_BASE_URL: Preview deployment URL (required)
 * - TEST_USER_EMAIL: Email for test user (default: sundarsingh@gmail.com)
 * - TEST_USER_PASSWORD: Password for test user (required)
 *
 * Usage:
 *   API_BASE_URL=https://preview.vercel.app TEST_USER_PASSWORD=secret pnpm test:preview
 */

export interface PreviewTestConfig {
  baseUrl: string;
  apiPrefix: string;
  timeout: number;
  debug: boolean;
  testUser: {
    email: string;
    password: string;
  };
}

const baseUrl = process.env.API_BASE_URL;
const testUserPassword = process.env.TEST_USER_PASSWORD;

if (!baseUrl) {
  throw new Error('API_BASE_URL environment variable is required for preview tests');
}

if (!testUserPassword) {
  throw new Error('TEST_USER_PASSWORD environment variable is required for preview tests');
}

export const previewConfig: PreviewTestConfig = {
  baseUrl,
  apiPrefix: '/api/v1',
  timeout: 60000, // 60 seconds (preview can be slower due to cold starts)
  debug: process.env.DEBUG === 'true',
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'sundarsingh@gmail.com',
    password: testUserPassword,
  },
};

export const getApiUrl = (path: string): string => {
  return `${previewConfig.baseUrl}${previewConfig.apiPrefix}${path}`;
};
