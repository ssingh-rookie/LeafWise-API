#!/bin/bash
# ============================================================================
# LeafWise API - Database Startup Script
# ============================================================================
# Starts PostgreSQL with pgvector using Docker
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Starting LeafWise Database...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}Docker is not running. Starting Docker Desktop...${NC}"
    open -a Docker
    echo "Waiting for Docker to start..."
    while ! docker info > /dev/null 2>&1; do
        sleep 2
    done
    echo -e "${GREEN}Docker started${NC}"
fi

# Start database container
cd "$PROJECT_DIR"
docker compose -f docker/docker-compose.yml up -d

# Wait for database to be ready
echo "Waiting for database to be healthy..."
until docker exec leafwise-db pg_isready -U postgres -d leafwise > /dev/null 2>&1; do
    sleep 1
done

echo ""
echo -e "${GREEN}Database is ready!${NC}"
echo ""
echo "Connection: postgresql://postgres:postgres@localhost:5433/leafwise"
echo "pgAdmin:    http://localhost:5050 (admin@leafwise.app / admin)"
echo ""
