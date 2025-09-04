# CloudNet Monitor - Deployment Status & Verification

## 🚀 Quick Deploy to Render

**Deploy your CloudNet Monitor now:**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/TejaswiBhavani/cloudnet-monitor)

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [x] **GitHub Account**: Repository access
- [x] **Render Account**: Sign up at [render.com](https://render.com) (free tier available)
- [x] **InfluxDB Cloud Account**: Sign up at [cloud.influxdata.com](https://cloud.influxdata.com) (free tier available)

## 🔍 Deployment Verification

### Step 1: Deploy to Render

1. Click the deploy button above
2. Connect your GitHub account to Render
3. Render will automatically:
   - Create backend service (`cloudnet-monitor-backend`)
   - Create frontend service (`cloudnet-monitor-frontend`) 
   - Create PostgreSQL database (`cloudnet-postgres`)
   - Build and deploy both services

### Step 2: Get Your Deployment URLs

After deployment completes, you'll receive URLs like:
- **Frontend**: `https://cloudnet-monitor-frontend-[random].onrender.com`
- **Backend**: `https://cloudnet-monitor-backend-[random].onrender.com`

> **Note**: Render assigns unique suffixes to avoid conflicts. Your actual URLs will be different from the examples in documentation.

### Step 3: Verify Backend Health

Test your backend deployment:
```bash
curl https://your-backend-url.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 123.45,
  "version": "1.0.0"
}
```

### Step 4: Configure InfluxDB Cloud (Optional)

For full functionality, set up InfluxDB Cloud:

1. **Create InfluxDB Cloud Account**:
   - Go to [cloud.influxdata.com](https://cloud.influxdata.com)
   - Sign up for free tier (30-day retention, 10K series)

2. **Create Organization & Bucket**:
   - Create organization (or use default)
   - Create bucket named `cloudnet_metrics`
   - Generate API token

3. **Update Environment Variables**:
   - Go to Render Dashboard → Your Backend Service → Environment
   - Update these variables:
     ```
     INFLUX_HOST=https://your-region.aws.cloud2.influxdata.com
     INFLUX_TOKEN=your_api_token_here
     INFLUX_ORG=your_organization_id
     INFLUX_BUCKET=cloudnet_metrics
     ```

### Step 5: Access Your Application

1. **Open Frontend URL** in your browser
2. **Access About Page**: Navigate to `/about` to see live deployment status and all service links
3. **Default Login Credentials**:
   - Admin: `admin` / `admin123`
   - Operator: `operator` / `operator123` 
   - Viewer: `viewer` / `viewer123`

   ⚠️ **Change these immediately after first login!**

4. **Verify Live Services**: The About page provides direct links to:
   - Backend API health check
   - API documentation
   - GitHub repository
   - Current deployment status

## 🟢 Success Indicators

Your deployment is successful when:

- [x] **Backend Health Check**: Returns 200 OK status
- [x] **Frontend Loads**: React app displays without errors
- [x] **Database Connected**: Login page appears (indicates PostgreSQL working)
- [x] **API Endpoints**: `/api` endpoint shows API documentation
- [x] **About Page**: `/about` page shows live deployment status with all working links
- [x] **WebSocket Ready**: Real-time features work (if InfluxDB configured)

## 🔴 Troubleshooting

### Common Issues

**1. Build Failures**
- Check Render build logs for specific error messages
- Ensure Node.js version compatibility (18+ required)

**2. Database Connection Issues**
- Verify PostgreSQL service is healthy in Render dashboard
- Check environment variables are properly set

**3. InfluxDB Connection Issues**
- App works without InfluxDB (mock data mode)
- Verify InfluxDB Cloud credentials are correct
- Check organization and bucket names

**4. CORS Errors**
- Frontend/backend URL mismatch in environment variables
- Update `ALLOWED_ORIGINS` in backend service

### Getting Help

- **Deployment Guide**: [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)
- **Setup Instructions**: [SETUP.md](./SETUP.md)
- **Create Issue**: [GitHub Issues](https://github.com/TejaswiBhavani/cloudnet-monitor/issues)

## 💰 Cost Overview

**Free Tier (Recommended for Testing)**:
- Render: Backend + Frontend + Database = **$0/month**
- InfluxDB Cloud: Free tier = **$0/month**
- **Total: $0/month** 🎉

**Production Tier** (if needed):
- Render Starter: ~$7-14/month per service
- InfluxDB Cloud: Usage-based pricing
- **Total: ~$15-50/month** depending on usage

---

## 🎯 Next Steps After Deployment

1. **Secure Your Application**:
   - Change default passwords
   - Review user roles and permissions
   - Enable HTTPS (automatically provided by Render)

2. **Configure Monitoring**:
   - Add your network devices via the web interface
   - Set up SNMP community strings
   - Configure alerting thresholds

3. **Customize Dashboard**:
   - Organize monitoring views
   - Set up custom alerts
   - Configure notification channels

**🚀 Your CloudNet Monitor is now running in production!**