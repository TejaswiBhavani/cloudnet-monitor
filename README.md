# CloudNet Monitor

[![Deploy to Render](https://img.shields.io/badge/deploy-render-blue?style=flat-square&logo=render)](https://render.com/deploy?repo=https://github.com/TejaswiBhavani/cloudnet-monitor)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/TejaswiBhavani/cloudnet-monitor?style=flat-square)](https://github.com/TejaswiBhavani/cloudnet-monitor/issues)
[![Documentation](https://img.shields.io/badge/docs-complete-green?style=flat-square)](./README.md)

**A Comprehensive Network Monitoring Platform for Modern Infrastructure**

CloudNet Monitor is a modern network observability platform that provides real-time monitoring and historical analysis of network infrastructure. It supports multi-vendor environments and provides visibility across network hardware, servers, cloud infrastructure, and applications.

## 🌐 Live Deployment

**🚀 Deploy Your Own Instance:**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/TejaswiBhavani/cloudnet-monitor)

**After deployment, your URLs will be:**
- **Frontend Dashboard**: `https://cloudnet-monitor-frontend-[YOUR-ID].onrender.com`
- **Backend API**: `https://cloudnet-monitor-backend-[YOUR-ID].onrender.com`
- **Health Check**: `https://cloudnet-monitor-backend-[YOUR-ID].onrender.com/health`
- **API Documentation**: `https://cloudnet-monitor-backend-[YOUR-ID].onrender.com/api`

> **🔍 Finding Your URLs**: After deployment, visit your [Render Dashboard](https://dashboard.render.com) to find the exact URLs assigned to your services. Render assigns unique IDs to prevent conflicts.

### Deployment Status Verification

Test your deployment using our verification script:
```bash
# Replace with your actual backend URL
./test-deployment.sh https://cloudnet-monitor-backend-YOUR-ID.onrender.com
```

**Expected Response** for a healthy deployment:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 123.45,
  "version": "1.0.0"
}
```

### Dynamic Status Badges (After Deployment)

Once you have your deployment URLs, you can use these badge URLs to show real-time status in your own README or documentation:

**Backend Status Badge:**
```markdown
[![Backend Status](https://img.shields.io/website?down_color=red&down_message=offline&label=backend&style=flat-square&up_color=green&up_message=online&url=https%3A%2F%2Fyour-backend-url.onrender.com%2Fhealth)](https://your-backend-url.onrender.com/health)
```

**Frontend Status Badge:**
```markdown
[![Frontend Status](https://img.shields.io/website?down_color=red&down_message=offline&label=frontend&style=flat-square&up_color=green&up_message=online&url=https%3A%2F%2Fyour-frontend-url.onrender.com)](https://your-frontend-url.onrender.com)
```

Just replace `your-backend-url` and `your-frontend-url` with your actual Render URLs.

## 🚀 Quick Deploy (FREE)

**✨ 100% FREE**: Render + InfluxDB Cloud free tiers = $0/month 🎉

📋 **After deployment**: [Complete Verification Guide](./DEPLOYMENT_VERIFICATION.md) | [Quick Test Script](./test-deployment.sh)

## Overview

CloudNet Monitor is a modern network observability platform that provides real-time monitoring and historical analysis of network infrastructure. It supports multi-vendor environments and provides visibility across network hardware, servers, cloud infrastructure, and applications.

## Architecture

### High-Level System Architecture

The system follows a modular, multi-layered architecture:

1. **Data Collection Layer**: Gathers telemetry data using SNMP, NetFlow/IPFIX/sFlow, and active monitoring
2. **Data Processing and Storage Layer**: Time-series database for metrics + PostgreSQL for metadata
3. **Backend API and Logic Layer**: Node.js/Express for real-time API + Python for data processing
4. **Presentation Layer**: React frontend with interactive data visualizations

### Technology Stack

- **Backend**: Node.js/Express (real-time API), Python (data processing)
- **Frontend**: React with Recharts for visualization
- **Database**: InfluxDB/Amazon Timestream (time-series) + PostgreSQL (metadata)
- **Cloud Infrastructure**: AWS (VPC, ECS, RDS, Lambda)
- **Monitoring Protocols**: SNMP, NetFlow/IPFIX, sFlow, Active monitoring

## Key Features

### Core Monitored Components
- Network Hardware (routers, switches, firewalls)
- Servers (physical and virtual)
- Cloud Infrastructure (VMs, containers, managed services)
- Applications and URLs
- Endpoints (printers, UPS, IoT devices)

### Key Performance Indicators (KPIs)
- **Availability**: Device status, server uptime, interface status
- **Performance**: Bandwidth utilization, latency, packet loss, error rates
- **Resource Utilization**: CPU load, memory consumption, disk usage
- **Traffic Analysis**: Throughput, packet rates, top talkers
- **Wireless Metrics**: Wi-Fi connectivity, channel utilization

## Quick Start

### 🚀 Deploy to Render (Recommended)

The fastest way to get CloudNet Monitor running in production **completely FREE**:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/TejaswiBhavani/cloudnet-monitor)

**✨ 100% Free Deployment**:
- Render free tier (backend + database + frontend)
- InfluxDB Cloud free tier (metrics storage)
- **Total cost: $0/month** 🎉

**Prerequisites**: 
- GitHub account
- Render account (free tier)
- InfluxDB Cloud account (free tier)

**Steps**:
1. Click the deploy button above
2. Sign up for [InfluxDB Cloud](https://cloud.influxdata.com)
3. Configure InfluxDB environment variables in Render
4. Access your deployed application

📖 **Comprehensive Guides**:
- **Quick Deployment**: [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md) - Verification & status checking
- **Detailed Setup**: [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) - Complete deployment guide
- **Configuration**: [SETUP.md](./SETUP.md) - Post-deployment setup

### 🔍 Check Deployment Status

After deploying, verify your application:

1. **Backend Health**: `https://your-backend-url.onrender.com/health`
2. **Frontend Access**: Open your frontend URL in browser
3. **API Documentation**: `https://your-backend-url.onrender.com/api`

> **Note**: Render assigns unique URLs to your deployment. Check your Render dashboard for the actual URLs.

📋 **Full Verification Guide**: [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md)

### 🐳 Local Development with Docker

### Prerequisites
- Node.js 18+
- Python 3.9+
- Docker and Docker Compose
- AWS CLI (for cloud deployment)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/TejaswiBhavani/cloudnet-monitor.git
cd cloudnet-monitor
```

2. Install dependencies:
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install

# Python dependencies
cd ../data-processing
pip install -r requirements.txt
```

3. Start the development environment:
```bash
docker-compose up -d
```

4. Access the dashboard at `http://localhost:3000`

### Production Deployment

The system is designed for deployment on AWS using:
- Amazon ECS for containerized services
- Amazon RDS for PostgreSQL
- Amazon Timestream for time-series data
- Amazon VPC for secure networking
- AWS Lambda for data processing functions

See `docs/deployment.md` for detailed deployment instructions.

## Project Structure

```
cloudnet-monitor/
├── backend/                 # Node.js/Express API server
├── frontend/               # React dashboard UI
├── data-processing/        # Python data processing services
├── data-collection/        # Data collection modules (SNMP, Flow)
├── infrastructure/         # AWS CloudFormation/Terraform configs
├── docs/                   # Documentation
├── docker/                 # Docker configurations
└── scripts/               # Deployment and utility scripts
```

## Security

The system implements enterprise-grade security:
- AWS VPC with public/private subnet architecture
- IAM roles with least privilege principle
- Security groups and NACLs for network protection
- Encrypted data storage and transmission
- Multi-factor authentication

## Contributing

Please read `CONTRIBUTING.md` for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

## Support

For support and documentation, please visit our [documentation site](docs/) or create an issue in this repository.