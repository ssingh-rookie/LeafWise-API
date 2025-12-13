#!/bin/bash
# ============================================================================
# LeafWise API - Full Stack Startup Script
# ============================================================================
# Starts both database and API server
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Starting LeafWise Full Stack...${NC}"
echo ""

# Start database
"$SCRIPT_DIR/start-db.sh"

# Start API
"$SCRIPT_DIR/start-api.sh"
