#!/bin/bash
# Start Local Supabase
# Usage: ./scripts/start-supabase.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Add Docker to PATH (macOS)
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

echo "Starting local Supabase..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Start Supabase
npx supabase start

echo ""
echo "Local Supabase is running!"
echo ""
echo "Quick reference:"
echo "  Studio:   http://127.0.0.1:54323"
echo "  API:      http://127.0.0.1:54321"
echo "  Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres"
echo ""
echo "To stop: pnpm supabase:stop"
