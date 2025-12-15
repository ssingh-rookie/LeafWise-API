#!/bin/bash
# Start LeafWise API Server
# Usage: ./scripts/start-api.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Kill any existing process on port 3000
kill_port() {
    local pid=$(lsof -ti:3000 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "Killing existing process on port 3000 (PID: $pid)..."
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Cleanup on script exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill_port
}
trap cleanup EXIT INT TERM

# Kill any existing process on port 3000
kill_port

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
