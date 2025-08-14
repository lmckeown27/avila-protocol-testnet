#!/bin/bash

# Build script for Render deployment
set -e  # Exit on any error

echo "🚀 Starting build process for Render..."

# Check Node.js version
echo "📋 Node.js version:"
node --version
echo "📋 NPM version:"
npm --version

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/ || true

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Install dev dependencies for build
echo "🔧 Installing dev dependencies..."
npm ci

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Verify build output
echo "✅ Build complete! Checking output..."
if [ ! -d "dist" ]; then
    echo "❌ Error: dist/ directory not created!"
    exit 1
fi

echo "📁 Build output contents:"
ls -la dist/

# Check if server.js exists
if [ ! -f "dist/server.js" ]; then
    echo "❌ Error: dist/server.js not found!"
    exit 1
fi

echo "🎯 Build successful! Ready to start server." 