// ============================================================================
// Application Configuration
// ============================================================================

import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'debug',

  // Environment checks
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  isPreview: process.env.VERCEL_ENV === 'preview',

  // Serverless detection
  isServerless: !!process.env.VERCEL,

  // App URL (for password reset redirects, deep links, etc.)
  appUrl: process.env.APP_URL || 'http://localhost:3000',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  },

  // Feature flags
  features: {
    enableStreaming: process.env.ENABLE_STREAMING !== 'false',
    enablePremiumFeatures: process.env.ENABLE_PREMIUM !== 'false',
    enableSwagger: process.env.NODE_ENV !== 'production',
  },

  // Rate limits (per hour)
  rateLimits: {
    general: 1000,
    identification: {
      free: 5,
      premium: -1, // Unlimited
    },
    healthAssessment: {
      free: 2,
      premium: -1,
    },
    chat: {
      free: 10,
      premium: -1,
    },
  },
}));
