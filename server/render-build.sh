#!/usr/bin/env bash
set -e

echo "=== Render Build Script ==="

# Install dependencies (Render runs npm install separately, but this ensures it)
npm install

# Build TypeScript
echo "Building TypeScript..."
npm run build

echo "=== Build Complete ==="
