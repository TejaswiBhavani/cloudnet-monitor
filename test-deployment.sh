#!/bin/bash

# CloudNet Monitor Deployment Test Script
# This script helps verify your Render deployment is working correctly

echo "🔍 CloudNet Monitor - Deployment Test"
echo "====================================="
echo ""

# Function to test URL with timeout
test_url() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo "Testing $description..."
    echo "URL: $url"
    
    # Test with curl and timeout
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url" 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        echo "✅ SUCCESS: $description is working (HTTP $response)"
    elif [ "$response" = "000" ]; then
        echo "❌ FAILED: $description is not accessible (connection failed)"
        echo "   Check if the URL is correct and the service is deployed"
    else
        echo "⚠️  WARNING: $description responded with HTTP $response (expected $expected_status)"
    fi
    echo ""
}

# Function to test JSON API endpoint
test_json_api() {
    local url=$1
    local description=$2
    
    echo "Testing $description..."
    echo "URL: $url"
    
    local response=$(curl -s --max-time 30 "$url" 2>/dev/null)
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url" 2>/dev/null)
    
    if [ "$status_code" = "200" ]; then
        echo "✅ SUCCESS: $description is working"
        echo "Response preview: $(echo "$response" | head -c 100)..."
    else
        echo "❌ FAILED: $description returned HTTP $status_code"
    fi
    echo ""
}

# Check if URLs are provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backend-url> [frontend-url]"
    echo ""
    echo "Example:"
    echo "  $0 https://cloudnet-monitor-backend-abc123.onrender.com"
    echo "  $0 https://cloudnet-monitor-backend-abc123.onrender.com https://cloudnet-monitor-frontend-xyz789.onrender.com"
    echo ""
    echo "You can find your URLs in the Render Dashboard after deployment."
    echo ""
    exit 1
fi

BACKEND_URL=$1
FRONTEND_URL=$2

# Remove trailing slash
BACKEND_URL=${BACKEND_URL%/}
FRONTEND_URL=${FRONTEND_URL%/}

echo "Backend URL: $BACKEND_URL"
if [ -n "$FRONTEND_URL" ]; then
    echo "Frontend URL: $FRONTEND_URL"
fi
echo ""

# Test backend endpoints
echo "🔧 Testing Backend Services"
echo "------------------------"
test_json_api "$BACKEND_URL/health" "Backend Health Check"
test_json_api "$BACKEND_URL/deployment-status" "Deployment Status"
test_json_api "$BACKEND_URL/api" "API Documentation"
test_url "$BACKEND_URL/test" "Environment Test Endpoint"

# Test frontend if URL provided
if [ -n "$FRONTEND_URL" ]; then
    echo "🎨 Testing Frontend Service"
    echo "------------------------"
    test_url "$FRONTEND_URL" "Frontend Application"
    test_url "$FRONTEND_URL/static/js" "Frontend Static Assets" 404
fi

echo "🏁 Test Complete"
echo "=================="

# Provide next steps
echo ""
echo "📝 Next Steps:"
echo "1. If all tests passed, your application is successfully deployed!"
echo "2. Open the frontend URL in your browser to access the dashboard"
echo "3. Default login: admin / admin123 (change after first login)"
echo "4. Configure InfluxDB Cloud for full monitoring capabilities"
echo ""
echo "📚 Need help?"
echo "- Deployment Guide: https://github.com/TejaswiBhavani/cloudnet-monitor/blob/main/RENDER_DEPLOYMENT.md"
echo "- Status Guide: https://github.com/TejaswiBhavani/cloudnet-monitor/blob/main/DEPLOYMENT_STATUS.md"
echo "- Create Issue: https://github.com/TejaswiBhavani/cloudnet-monitor/issues"