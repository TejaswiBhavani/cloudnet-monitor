#!/bin/bash

# CloudNet Monitor Deployment Test Script
# This script helps verify your Render deployment is working correctly

set -e  # Exit on any error

echo "🔍 CloudNet Monitor - Deployment Test"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ SUCCESS${NC}: $message"
            ;;
        "FAILED")
            echo -e "${RED}❌ FAILED${NC}: $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  WARNING${NC}: $message"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  INFO${NC}: $message"
            ;;
    esac
}

# Function to test URL with timeout
test_url() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo "Testing $description..."
    echo "URL: $url"
    
    # Test with curl and timeout
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url" 2>/dev/null)
    local curl_exit_code=$?
    
    if [ $curl_exit_code -ne 0 ]; then
        print_status "FAILED" "$description - Connection failed (curl exit code: $curl_exit_code)"
        echo "   Possible causes: Service not deployed, wrong URL, or network issue"
    elif [ "$response" = "$expected_status" ]; then
        print_status "SUCCESS" "$description is working (HTTP $response)"
    elif [ "$response" = "000" ]; then
        print_status "FAILED" "$description is not accessible (connection failed)"
        echo "   Check if the URL is correct and the service is deployed"
    else
        print_status "WARNING" "$description responded with HTTP $response (expected $expected_status)"
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
    local curl_exit_code=$?
    
    if [ $curl_exit_code -ne 0 ]; then
        print_status "FAILED" "$description - Connection failed"
    elif [ "$status_code" = "200" ]; then
        print_status "SUCCESS" "$description is working"
        echo "Response preview: $(echo "$response" | head -c 100)..."
        
        # Try to parse as JSON and show pretty output
        if command -v jq >/dev/null 2>&1; then
            echo "Parsed response:"
            echo "$response" | jq . 2>/dev/null || echo "$response"
        fi
    else
        print_status "FAILED" "$description returned HTTP $status_code"
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
    print_status "INFO" "You can find your URLs in the Render Dashboard after deployment."
    echo ""
    echo "📚 Need help finding your URLs?"
    echo "   1. Go to https://dashboard.render.com"
    echo "   2. Look for services named 'cloudnet-monitor-backend' and 'cloudnet-monitor-frontend'"
    echo "   3. Click on each service to see its assigned URL"
    echo ""
    exit 1
fi

BACKEND_URL=$1
FRONTEND_URL=$2

# Remove trailing slash
BACKEND_URL=${BACKEND_URL%/}
FRONTEND_URL=${FRONTEND_URL%/}

print_status "INFO" "Starting deployment verification..."
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
echo "📊 Add Status Badges:"
echo "Copy these badges to show your deployment status:"
echo ""
echo "Backend Status:"
echo "[![Backend Status](https://img.shields.io/website?down_color=red&down_message=offline&label=backend&style=flat-square&up_color=green&up_message=online&url=$(echo "$BACKEND_URL/health" | sed 's/:/\%3A/g' | sed 's/\//\%2F/g'))]($BACKEND_URL/health)"
echo ""
if [ -n "$FRONTEND_URL" ]; then
echo "Frontend Status:"
echo "[![Frontend Status](https://img.shields.io/website?down_color=red&down_message=offline&label=frontend&style=flat-square&up_color=green&up_message=online&url=$(echo "$FRONTEND_URL" | sed 's/:/\%3A/g' | sed 's/\//\%2F/g'))]($FRONTEND_URL)"
echo ""
fi
echo "📚 Need help?"
echo "- Deployment Guide: https://github.com/TejaswiBhavani/cloudnet-monitor/blob/main/RENDER_DEPLOYMENT.md"
echo "- Verification Guide: https://github.com/TejaswiBhavani/cloudnet-monitor/blob/main/DEPLOYMENT_VERIFICATION.md"
echo "- Create Issue: https://github.com/TejaswiBhavani/cloudnet-monitor/issues"