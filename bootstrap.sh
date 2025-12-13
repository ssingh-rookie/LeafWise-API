#!/bin/bash

# ============================================================================
# LeafWise API - Project Bootstrap Script
# ============================================================================
# This script initializes the LeafWise API project
# Run with: chmod +x bootstrap.sh && ./bootstrap.sh
# ============================================================================

set -e

echo "🌿 LeafWise API - Project Bootstrap"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed."
    echo "  Install from: https://nodejs.org/ (v20+ recommended)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_warning "Node.js v20+ is recommended. You have v$NODE_VERSION"
fi

if ! command -v pnpm &> /dev/null; then
    print_info "pnpm not found. Installing..."
    npm install -g pnpm
fi

if ! command -v docker &> /dev/null; then
    print_warning "Docker not found. You'll need it for local database."
    echo "  Install from: https://docker.com/"
fi

print_status "Prerequisites check passed"
echo ""

# Install dependencies
echo "Installing dependencies..."
pnpm install
print_status "Dependencies installed"
echo ""

# Generate Prisma client
echo "Generating Prisma client..."
pnpm prisma generate
print_status "Prisma client generated"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    print_warning ".env file created from .env.example"
    echo "  ⚠️  Please update .env with your API keys before starting"
else
    print_info ".env file already exists"
fi

echo ""
echo "===================================="
echo -e "${GREEN}🎉 Bootstrap complete!${NC}"
echo "===================================="
echo ""
echo "Next steps:"
echo ""
echo "  1. Update .env with your API keys:"
echo "     - DATABASE_URL (Supabase or local)"
echo "     - ANTHROPIC_API_KEY"
echo "     - OPENAI_API_KEY"
echo "     - PLANT_ID_API_KEY"
echo ""
echo "  2. Start the local database:"
echo "     ${BLUE}pnpm docker:up${NC}"
echo ""
echo "  3. Run database migrations:"
echo "     ${BLUE}pnpm db:migrate:dev${NC}"
echo ""
echo "  4. Seed the database:"
echo "     ${BLUE}pnpm db:seed${NC}"
echo ""
echo "  5. Start development server:"
echo "     ${BLUE}pnpm dev${NC}"
echo ""
echo "Documentation:"
echo "  - CLAUDE.md          - AI agent instructions"
echo "  - docs/ARCHITECTURE  - System design"
echo "  - docs/API_SPEC      - API endpoints"
echo "  - docs/DATABASE      - Database schema"
echo ""
echo "API will be available at: http://localhost:3000/api/v1"
echo "Swagger docs at: http://localhost:3000/api/docs"
echo ""
