# CloudNet Monitor - Render Deployment Guide

This guide will help you deploy the CloudNet Monitor application to Render.com.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **InfluxDB Cloud Account**: Sign up at [cloud.influxdata.com](https://cloud.influxdata.com) for time-series metrics storage
3. **GitHub Repository**: Fork or have access to this repository

## 🆓 Free Tier Deployment

This CloudNet Monitor deployment is **completely configured for Render's free tier**:

- **Backend Service**: Uses Render's free web service plan
- **Database**: PostgreSQL free tier (1GB storage)
- **Frontend**: Static site hosting (free with 100GB bandwidth)
- **InfluxDB**: InfluxDB Cloud free tier (30-day retention)

**Total Monthly Cost**: $0 🎉

### Free Tier Limitations
- Services sleep after 15 minutes of inactivity (cold starts may take 30+ seconds)
- 750 hours of uptime per month per service
- Limited CPU and memory resources
- PostgreSQL: 1GB storage limit
- InfluxDB Cloud: 30-day data retention on free tier

## Quick Deploy with Render Blueprint

### Option 1: One-Click Deploy (Recommended)

Click the button below to deploy directly to Render:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/TejaswiBhavani/cloudnet-monitor)

### Option 2: Manual Setup

1. **Connect Repository**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" and select "Blueprint"
   - Connect your GitHub repository
   - Select the `render.yaml` file

2. **Configure Environment Variables**:
   After deployment, you'll need to set up InfluxDB Cloud:
   
   - `INFLUX_HOST`: Your InfluxDB Cloud URL (e.g., `https://us-west-2-1.aws.cloud2.influxdata.com`)
   - `INFLUX_TOKEN`: Your InfluxDB Cloud API token
   - `INFLUX_ORG`: Your InfluxDB Cloud organization ID
   - `INFLUX_BUCKET`: Bucket name (default: `cloudnet_metrics`)

## InfluxDB Cloud Setup

1. **Create InfluxDB Cloud Account**:
   - Go to [cloud.influxdata.com](https://cloud.influxdata.com)
   - Sign up for a free account

2. **Get Connection Details**:
   - After login, note your **Organization ID**
   - Go to Data > Buckets and create a bucket named `cloudnet_metrics`
   - Go to Data > API Tokens and create a new token with read/write permissions

3. **Configure Render Environment Variables**:
   In your Render backend service settings, add:
   ```
   INFLUX_HOST=https://us-west-2-1.aws.cloud2.influxdata.com
   INFLUX_TOKEN=your_influxdb_token_here
   INFLUX_ORG=your_organization_id
   INFLUX_BUCKET=cloudnet_metrics
   ```

## Services Deployed

Your Render deployment will include:

### Backend API Service
- **Type**: Web Service
- **URL**: `https://cloudnet-monitor-backend.onrender.com`
- **Health Check**: `/health`
- **Features**: 
  - REST API for device management
  - WebSocket for real-time updates
  - SNMP polling capabilities
  - JWT authentication

### Frontend Application
- **Type**: Static Site
- **URL**: `https://cloudnet-monitor-frontend.onrender.com`
- **Features**:
  - React-based dashboard
  - Real-time metrics visualization
  - Device management interface
  - Alert management

### PostgreSQL Database
- **Type**: Managed Database (Free tier)
- **Purpose**: Metadata and configuration storage
- **Auto-configured**: Connection details automatically injected

## Configuration

### Environment Variables

The following environment variables are automatically configured:

#### Backend Service
- `NODE_ENV=production`
- `PORT=10000` (Render default)
- Database connections (auto-configured)
- JWT secrets (auto-generated)
- CORS origins (set to frontend URL)

#### Frontend Service
- `REACT_APP_API_URL` (set to backend service URL)
- `REACT_APP_WS_URL` (set to backend WebSocket URL)

### Custom Domain (Optional)

1. In Render Dashboard, go to your frontend service
2. Click "Settings" > "Custom Domains"
3. Add your domain and configure DNS
4. Update CORS origins in backend service settings

## Security Considerations

### Production Checklist

- [ ] InfluxDB Cloud token is properly secured
- [ ] JWT secrets are auto-generated (secure)
- [ ] Database passwords are auto-generated (secure)
- [ ] HTTPS is enabled by default on Render
- [ ] Update default admin credentials after first login
- [ ] Configure proper CORS origins if using custom domain

### Default Credentials

**⚠️ IMPORTANT**: Change these default credentials after first login!

- **Admin**: `admin` / `admin123`
- **Operator**: `operator` / `operator123`
- **Viewer**: `viewer` / `viewer123`

## Monitoring and Logs

### Application Logs
- Go to your service in Render Dashboard
- Click "Logs" tab to view real-time logs
- Use filters to search specific log levels

### Health Checks
- Backend health: `https://your-backend-url.onrender.com/health`
- Frontend availability: Automatic via Render

### Metrics
- Application metrics are stored in InfluxDB Cloud
- System metrics are available in Render Dashboard

## Scaling

### Free Tier Limitations
- Services may sleep after 15 minutes of inactivity
- 750 hours of uptime per month
- Limited memory and CPU

### Upgrading from Free Tier
**Consider upgrading when you need:**
1. **Always-on services** (no cold starts) - Upgrade to Starter plan ($7/month per service)
2. **More database storage** - Upgrade PostgreSQL to Starter plan ($7/month for 10GB)
3. **Higher resource limits** - More CPU/memory for intensive monitoring
4. **Longer data retention** - InfluxDB Cloud paid plans for extended historical data

## Troubleshooting

### Common Issues

1. **Service Won't Start**:
   - Check environment variables are set correctly
   - Review build logs in Render Dashboard
   - Ensure InfluxDB Cloud credentials are correct

2. **Database Connection Errors**:
   - Verify PostgreSQL service is running
   - Check database environment variables
   - Review connection logs

3. **InfluxDB Connection Issues**:
   - Verify InfluxDB Cloud token and organization
   - Check network connectivity
   - Application will fall back to mock mode if InfluxDB unavailable

4. **Frontend Not Loading**:
   - Check if backend service is running
   - Verify API URL environment variables
   - Check CORS configuration

### Getting Help

1. Check the [Render Documentation](https://render.com/docs)
2. Review application logs in Render Dashboard
3. Create an issue in the repository
4. Check InfluxDB Cloud status page

## Cost Optimization

### Free Tier Usage
- PostgreSQL: 1GB storage
- Web Services: 750 hours/month
- Static Sites: 100GB bandwidth

### Monitoring Costs
- Set up billing alerts in Render Dashboard
- Monitor InfluxDB Cloud usage (free tier: 30 days retention)
- Consider data retention policies

## Backup and Recovery

### Database Backups
- Render PostgreSQL: Automatic daily backups (7-day retention on free tier)
- Export important configuration data periodically

### InfluxDB Backups
- InfluxDB Cloud: Built-in replication and backups
- Export important metrics data if needed

## Support

For deployment issues:
1. Check this deployment guide
2. Review Render documentation
3. Check application logs
4. Contact support through GitHub issues

---

**Next Steps**: After deployment, access your application and update the default credentials!