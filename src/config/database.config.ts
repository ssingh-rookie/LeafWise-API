// ============================================================================
// Database Configuration
// ============================================================================

import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  // Connection URLs
  url: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Connection pool settings (for serverless)
  pool: {
    min: 0,
    max: 1, // Serverless typically uses 1 connection
  },

  // Logging
  logging: process.env.NODE_ENV === 'development',
}));
