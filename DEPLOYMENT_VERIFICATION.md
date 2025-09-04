# CloudNet Monitor - Deployment Verification Guide

## 🔍 How to Verify Your Deployment

After deploying CloudNet Monitor to Render, follow these steps to verify everything is working correctly:

### Step 1: Find Your Deployment URLs

1. Go to your [Render Dashboard](https://dashboard.render.com)
2. Locate your CloudNet Monitor services:
   - `cloudnet-monitor-backend` (Web Service)
   - `cloudnet-monitor-frontend` (Static Site)
   - `cloudnet-postgres` (Database)

3. Copy the URLs for your services:
   - **Backend**: `https://cloudnet-monitor-backend-[YOUR-ID].onrender.com`
   - **Frontend**: `https://cloudnet-monitor-frontend-[YOUR-ID].onrender.com`

### Step 2: Automated Testing

Use our verification script for comprehensive testing:

```bash
# Test backend only
./test-deployment.sh https://cloudnet-monitor-backend-YOUR-ID.onrender.com

# Test both backend and frontend
./test-deployment.sh https://cloudnet-monitor-backend-YOUR-ID.onrender.com https://cloudnet-monitor-frontend-YOUR-ID.onrender.com
```

### Step 3: Manual Verification

#### Backend Health Check
Test the backend API directly:

```bash
curl https://cloudnet-monitor-backend-YOUR-ID.onrender.com/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 123.45,
  "version": "1.0.0",
  "database": "connected",
  "influxdb": "connected" // or "mock_mode" if InfluxDB not configured
}
```

#### Frontend Access
1. Open your frontend URL in a browser
2. You should see the CloudNet Monitor login page
3. Try logging in with default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`

#### API Documentation
Visit your backend API documentation:
```
https://cloudnet-monitor-backend-YOUR-ID.onrender.com/api
```

### Step 4: Add Status Badges to Your README

Once verified, add live status badges to your project documentation:

```markdown
[![Backend Status](https://img.shields.io/website?down_color=red&down_message=offline&label=backend&style=flat-square&up_color=green&up_message=online&url=https%3A%2F%2Fcloudnet-monitor-backend-YOUR-ID.onrender.com%2Fhealth)](https://cloudnet-monitor-backend-YOUR-ID.onrender.com/health)

[![Frontend Status](https://img.shields.io/website?down_color=red&down_message=offline&label=frontend&style=flat-square&up_color=green&up_message=online&url=https%3A%2F%2Fcloudnet-monitor-frontend-YOUR-ID.onrender.com)](https://cloudnet-monitor-frontend-YOUR-ID.onrender.com)
```

Replace `YOUR-ID` with your actual Render service IDs. You can also use our test script to generate the exact badge URLs:

```bash
./test-deployment.sh https://cloudnet-monitor-backend-YOUR-ID.onrender.com https://cloudnet-monitor-frontend-YOUR-ID.onrender.com
```

The script will output ready-to-copy badge markdown at the end.

## 🟢 Success Indicators

Your deployment is successful when:

- ✅ Backend health endpoint returns HTTP 200
- ✅ Frontend loads without errors
- ✅ Login page is accessible
- ✅ API documentation is available
- ✅ Database connection is established
- ✅ Default credentials work for login

## 🔴 Common Issues

### Backend Not Responding
- **Symptom**: Health check returns 503 or times out
- **Solution**: Check Render logs for build/startup errors

### Frontend Shows Error Page
- **Symptom**: Frontend loads but shows API connection error
- **Solution**: Verify backend URL is correctly set in frontend environment variables

### Database Connection Errors
- **Symptom**: Backend health shows database disconnected
- **Solution**: Ensure PostgreSQL service is running in Render dashboard

### InfluxDB Connection Issues
- **Symptom**: Backend works but shows "mock_mode" for InfluxDB
- **Solution**: Configure InfluxDB Cloud credentials in Render environment variables

## 🛠️ Advanced Verification

### Test API Endpoints
```bash
# Get device list
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://cloudnet-monitor-backend-YOUR-ID.onrender.com/api/devices

# Check system status
curl https://cloudnet-monitor-backend-YOUR-ID.onrender.com/api/system/status
```

### WebSocket Connection Test
Open browser developer tools and check for WebSocket connections to:
```
wss://cloudnet-monitor-backend-YOUR-ID.onrender.com/ws
```

## 📞 Getting Help

If verification fails:

1. **Check Render Logs**: Go to your service in Render dashboard → Logs tab
2. **Review Environment Variables**: Ensure all required variables are set
3. **Test InfluxDB**: Try with and without InfluxDB configuration
4. **Create Issue**: [GitHub Issues](https://github.com/TejaswiBhavani/cloudnet-monitor/issues)

## 🎯 Next Steps After Verification

1. **Change Default Passwords**: Update admin credentials immediately
2. **Configure InfluxDB**: Set up InfluxDB Cloud for metrics storage
3. **Add Devices**: Start monitoring your network infrastructure
4. **Setup Alerts**: Configure alert rules for your environment
5. **Customize Dashboard**: Adapt the interface to your needs

---

**📚 Additional Resources:**
- [Complete Deployment Guide](./RENDER_DEPLOYMENT.md)
- [Configuration Guide](./SETUP.md)
- [Troubleshooting](./DEPLOYMENT_STATUS.md)