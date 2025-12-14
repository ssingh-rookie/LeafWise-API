/**
 * Test Auth Flow Script
 *
 * Tests signup, forgot-password, and reset-password endpoints against localhost.
 *
 * Usage:
 *   npx ts-node test/scripts/test-auth-flow.ts
 *
 * Or with custom URL:
 *   API_URL=http://localhost:3000 npx ts-node test/scripts/test-auth-flow.ts
 */

import axios, { AxiosError } from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_PREFIX = '/api/v1';

// Generate unique test email
const testEmail = `test-${Date.now()}@leafwise-test.app`;
const testPassword = 'TestPassword123!';
const testName = 'Test User';

interface AuthResponse {
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
}

interface ForgotPasswordResponse {
  message: string;
}

async function makeRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  data?: unknown,
  token?: string,
): Promise<{ status: number; data: T }> {
  const url = `${API_URL}${API_PREFIX}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await axios({
      method,
      url,
      data,
      headers,
      timeout: 30000,
    });
    return { status: response.status, data: response.data };
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    const status = axiosError.response?.status || 500;
    const message = axiosError.response?.data?.message || axiosError.message;
    throw { status, message };
  }
}

function log(emoji: string, message: string, data?: unknown) {
  console.log(`\n${emoji} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logSuccess(message: string, data?: unknown) {
  log('✅', message, data);
}

function logError(message: string, error?: unknown) {
  log('❌', message, error);
}

function logInfo(message: string, data?: unknown) {
  log('ℹ️', message, data);
}

async function testSignup(): Promise<AuthResponse | null> {
  logInfo('Testing POST /auth/signup', { email: testEmail, name: testName });

  try {
    const response = await makeRequest<AuthResponse>('POST', '/auth/signup', {
      email: testEmail,
      password: testPassword,
      name: testName,
    });

    logSuccess(`Signup successful (${response.status})`, {
      userId: response.data.user.id,
      email: response.data.user.email,
      hasAccessToken: !!response.data.session.accessToken,
      hasRefreshToken: !!response.data.session.refreshToken,
    });

    return response.data;
  } catch (error: any) {
    logError(`Signup failed (${error.status})`, { message: error.message });
    return null;
  }
}

async function testForgotPassword(email: string): Promise<boolean> {
  logInfo('Testing POST /auth/forgot-password', { email });

  try {
    const response = await makeRequest<ForgotPasswordResponse>('POST', '/auth/forgot-password', {
      email,
    });

    logSuccess(`Forgot password request successful (${response.status})`, response.data);
    return true;
  } catch (error: any) {
    logError(`Forgot password failed (${error.status})`, { message: error.message });
    return false;
  }
}

async function testForgotPasswordNonExistent(): Promise<boolean> {
  const fakeEmail = 'nonexistent-user-12345@fake-domain.com';
  logInfo('Testing POST /auth/forgot-password with non-existent email', { email: fakeEmail });

  try {
    const response = await makeRequest<ForgotPasswordResponse>('POST', '/auth/forgot-password', {
      email: fakeEmail,
    });

    // Should still return 200 for security (no email enumeration)
    logSuccess(
      `Forgot password returns success for non-existent email (${response.status}) - GOOD for security!`,
      response.data,
    );
    return true;
  } catch (error: any) {
    logError(`Forgot password failed (${error.status})`, { message: error.message });
    return false;
  }
}

async function testResetPasswordInvalidToken(): Promise<boolean> {
  logInfo('Testing POST /auth/reset-password with invalid token');

  try {
    await makeRequest('POST', '/auth/reset-password', {
      token: 'invalid-token-12345',
      newPassword: 'NewPassword456!',
    });

    logError('Reset password should have failed with invalid token');
    return false;
  } catch (error: any) {
    if (error.status === 401) {
      logSuccess(`Reset password correctly rejected invalid token (${error.status})`, {
        message: error.message,
      });
      return true;
    }
    logError(`Unexpected error (${error.status})`, { message: error.message });
    return false;
  }
}

async function testLogin(email: string, password: string): Promise<AuthResponse | null> {
  logInfo('Testing POST /auth/login', { email });

  try {
    const response = await makeRequest<AuthResponse>('POST', '/auth/login', {
      email,
      password,
    });

    logSuccess(`Login successful (${response.status})`, {
      userId: response.data.user.id,
      email: response.data.user.email,
      hasAccessToken: !!response.data.session.accessToken,
    });

    return response.data;
  } catch (error: any) {
    logError(`Login failed (${error.status})`, { message: error.message });
    return null;
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('🧪 Auth Flow Test Script');
  console.log('═'.repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log(`Test Email: ${testEmail}`);
  console.log('═'.repeat(60));

  const results: { test: string; passed: boolean }[] = [];

  // Test 1: Health check
  logInfo('Testing API health...');
  try {
    await makeRequest('GET', '/health');
    logSuccess('API is healthy');
  } catch (error: any) {
    logError('API health check failed - is the server running?', error);
    console.log('\n💡 Start the server with: pnpm dev\n');
    process.exit(1);
  }

  // Test 2: Signup
  console.log('\n' + '─'.repeat(60));
  console.log('TEST 1: Signup');
  console.log('─'.repeat(60));
  const authData = await testSignup();
  results.push({ test: 'Signup', passed: !!authData });

  // Test 3: Login (verify signup worked)
  if (authData) {
    console.log('\n' + '─'.repeat(60));
    console.log('TEST 2: Login (verify signup)');
    console.log('─'.repeat(60));
    const loginData = await testLogin(testEmail, testPassword);
    results.push({ test: 'Login', passed: !!loginData });
  }

  // Test 4: Forgot password with valid email
  console.log('\n' + '─'.repeat(60));
  console.log('TEST 3: Forgot Password (valid email)');
  console.log('─'.repeat(60));
  const forgotValid = await testForgotPassword(testEmail);
  results.push({ test: 'Forgot Password (valid)', passed: forgotValid });

  // Test 5: Forgot password with non-existent email (should still return 200)
  console.log('\n' + '─'.repeat(60));
  console.log('TEST 4: Forgot Password (non-existent email - security test)');
  console.log('─'.repeat(60));
  const forgotNonExistent = await testForgotPasswordNonExistent();
  results.push({ test: 'Forgot Password (non-existent)', passed: forgotNonExistent });

  // Test 6: Reset password with invalid token
  console.log('\n' + '─'.repeat(60));
  console.log('TEST 5: Reset Password (invalid token)');
  console.log('─'.repeat(60));
  const resetInvalid = await testResetPasswordInvalidToken();
  results.push({ test: 'Reset Password (invalid token)', passed: resetInvalid });

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('═'.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.passed ? 'PASSED' : 'FAILED'}`);
    if (result.passed) passed++;
    else failed++;
  }

  console.log('─'.repeat(60));
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(60));

  // Note about reset password
  console.log('\n📝 Note: To fully test reset-password, you need to:');
  console.log('   1. Call forgot-password endpoint');
  console.log('   2. Check email for reset link');
  console.log('   3. Extract token from link');
  console.log('   4. Call reset-password with token');
  console.log('\n   The reset-password test above verifies invalid tokens are rejected.');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
