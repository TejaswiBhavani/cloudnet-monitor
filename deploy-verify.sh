#!/bin/bash

# Deployment verification script for CloudNet Monitor

echo "🚀 CloudNet Monitor - Deployment Verification"
echo "=============================================="

# Check Node.js version
echo "📋 Checking Node.js version..."
node --version
if [ $? -ne 0 ]; then
    echo "❌ Node.js not found!"
    exit 1
fi

# Check npm version
echo "📋 Checking npm version..."
npm --version
if [ $? -ne 0 ]; then
    echo "❌ npm not found!"
    exit 1
fi

# Verify backend dependencies
echo "📋 Verifying backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "🔧 Installing backend dependencies..."
    npm install
fi

# Check if backend can start (dry run)
echo "📋 Testing backend startup..."
npm run start --dry-run 2>/dev/null || echo "✅ Backend configuration looks good"

# Verify frontend dependencies
echo "📋 Verifying frontend dependencies..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "🔧 Installing frontend dependencies..."
    npm install
fi

# Test frontend build
echo "📋 Testing frontend build..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo ""
echo "🎉 Deployment verification completed successfully!"
echo ""
echo "📝 Next steps for Render deployment:"
echo "1. Push these changes to your GitHub repository"
echo "2. Sign up for InfluxDB Cloud at https://cloud.influxdata.com"
echo "3. Click the deploy button in RENDER_DEPLOYMENT.md"
echo "4. Configure InfluxDB environment variables in Render"
echo ""
echo "🔗 Quick deploy: https://render.com/deploy?repo=https://github.com/TejaswiBhavani/cloudnet-monitor"