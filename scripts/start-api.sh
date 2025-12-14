#!/bin/bash
# Start LeafWise API Server
# Usage: ./scripts/start-api.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check if Supabase is running
if ! npx supabase status > /dev/null 2>&1; then
    echo "Warning: Local Supabase doesn't appear to be running."
    echo "Run './scripts/start-supabase.sh' first, or press Enter to continue anyway."
    read -r
fi

echo "Starting LeafWise API server..."
echo ""

# Start the dev server
pnpm dev
