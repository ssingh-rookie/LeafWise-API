-- ============================================================================
-- LeafWise API - Database Initialization
-- ============================================================================
-- This script runs when the PostgreSQL container is first created
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create additional schemas if needed
-- CREATE SCHEMA IF NOT EXISTS leafwise;

-- Grant permissions (for local development)
GRANT ALL PRIVILEGES ON DATABASE leafwise TO postgres;

-- Output confirmation
DO $$
BEGIN
    RAISE NOTICE 'LeafWise database initialized successfully';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, vector';
END $$;
