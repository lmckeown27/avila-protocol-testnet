#!/bin/bash

# Build script for Render deployment
echo "🚀 Starting build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Verify build output
echo "✅ Build complete!"
echo "📁 Build output:"
ls -la dist/

echo "🎯 Ready to start server!" 