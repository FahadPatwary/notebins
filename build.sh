#!/bin/bash

# Navigate to the server directory
cd server

# Install dependencies
echo "Installing dependencies..."
npm install

# Build TypeScript files
echo "Building TypeScript files..."
npm run build

# Ensure dist directory exists
echo "Checking dist directory..."
if [ ! -d "dist" ]; then
  echo "Creating dist directory..."
  mkdir -p dist
fi

# Verify the build
if [ -f "dist/index.js" ]; then
  echo "Build successful! dist/index.js exists."
else
  echo "Error: dist/index.js not found after build!"
  exit 1
fi

# Return to root directory
cd ..

echo "Build process completed!" 