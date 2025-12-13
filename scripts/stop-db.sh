#!/bin/bash
# ============================================================================
# LeafWise API - Database Stop Script
# ============================================================================
# Stops the PostgreSQL Docker containers
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Stopping LeafWise Database...${NC}"

cd "$PROJECT_DIR"
docker compose -f docker/docker-compose.yml down

echo -e "${GREEN}Database stopped${NC}"
