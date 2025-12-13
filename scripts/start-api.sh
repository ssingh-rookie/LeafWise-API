#!/bin/bash
# ============================================================================
# LeafWise API - API Server Startup Script
# ============================================================================
# Starts the NestJS development server
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

echo -e "${BLUE}Starting LeafWise API...${NC}"

cd "$PROJECT_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pnpm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${RED}Please update .env with your configuration${NC}"
fi

# Check if database is running
if ! docker exec leafwise-db pg_isready -U postgres -d leafwise > /dev/null 2>&1; then
    echo -e "${YELLOW}Database not running. Start it with: ./scripts/start-db.sh${NC}"
    echo ""
    read -p "Start database now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        "$SCRIPT_DIR/start-db.sh"
    else
        echo -e "${RED}Cannot start API without database${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}Starting development server...${NC}"
echo ""

# Start the API
pnpm dev
