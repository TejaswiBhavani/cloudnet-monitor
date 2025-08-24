#!/bin/bash

# Build script for Render deployment
echo "Starting CloudNet Monitor backend build..."

# Install dependencies
npm install

# Create logs directory
mkdir -p logs

# Run any database migrations or setup if needed
# npm run migrate (uncomment if you have migrations)

echo "Backend build completed successfully!"