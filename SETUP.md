# CloudNet Monitor - Quick Start Guide

This guide will help you set up and run the CloudNet Monitor network monitoring dashboard.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 12+ (if not using Docker)
- InfluxDB 2.0+ (if not using Docker)

## Quick Start with Docker

1. **Clone the repository:**
```bash
git clone <repository-url>
cd cloudnet-monitor
```

2. **Start all services:**
```bash
docker-compose up -d
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- InfluxDB: http://localhost:8086
- PostgreSQL: localhost:5432

4. **Login with demo credentials:**
- Admin: `admin` / `admin123`
- Operator: `operator` / `operator123`
- Viewer: `viewer` / `viewer123`

## Local Development Setup

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your database configurations
```

4. **Start the backend:**
```bash
npm run dev
```

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the frontend:**
```bash
npm start
```

## Adding Network Devices

Once logged in, you can add network devices for monitoring:

1. Go to the **Devices** page
2. Click **Add Device**
3. Fill in device information:
   - Device ID (unique identifier)
   - Name and description
   - IP address or hostname
   - Device type (router, switch, server, etc.)
   - SNMP community string (default: `public`)
   - SNMP version (1, 2c, or 3)

## Features

### Implemented ✅
- **Authentication & Authorization**: JWT-based with role-based access
- **Real-time Dashboard**: WebSocket-powered live updates
- **SNMP Monitoring**: Multi-vendor device support
- **Metrics Collection**: Time-series data with InfluxDB
- **Device Management**: CRUD operations for network devices
- **Alert System**: Configurable rules and notifications
- **API Documentation**: Complete REST API
- **Security**: Encrypted communications and secure storage

### Core Monitoring Capabilities
- **Device Health**: CPU, memory, disk utilization
- **Network Performance**: Bandwidth, latency, packet loss
- **Interface Monitoring**: Port status, traffic statistics
- **System Metrics**: Uptime, temperature, error rates
- **Flow Analysis**: NetFlow/IPFIX/sFlow support (planned)

### Supported Device Types
- Routers (Cisco, Juniper, etc.)
- Switches (managed switches with SNMP)
- Firewalls
- Servers (Windows, Linux)
- Network appliances
- UPS devices
- Printers

## Architecture

### Technology Stack
- **Frontend**: React 18 + Material-UI + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Databases**: PostgreSQL (metadata) + InfluxDB (metrics)
- **Real-time**: WebSockets for live updates
- **Monitoring**: SNMP polling + Flow analysis
- **Deployment**: Docker + AWS-ready

### Security Features
- JWT authentication with refresh tokens
- Role-based access control (Admin/Operator/Viewer)
- HTTPS/WSS encryption
- SNMP v3 support
- API rate limiting
- Input validation and sanitization

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/profile` - User profile

### Devices
- `GET /api/devices` - List all devices
- `POST /api/devices` - Add new device
- `GET /api/devices/:id` - Get device details
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device
- `GET /api/devices/:id/metrics` - Get device metrics

### Metrics
- `GET /api/metrics` - Query metrics data
- `GET /api/metrics/realtime` - Real-time metrics
- `GET /api/metrics/timeseries` - Time-series data
- `POST /api/metrics/query` - Custom queries

### Alerts
- `GET /api/alerts` - List active alerts
- `POST /api/alerts/rules` - Create alert rule
- `PUT /api/alerts/rules/:id` - Update alert rule
- `POST /api/alerts/:id/acknowledge` - Acknowledge alert

## Configuration

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secret-key
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=cloudnet_monitor
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
INFLUX_HOST=localhost
INFLUX_PORT=8086
INFLUX_DB=cloudnet_metrics
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=ws://localhost:3001/ws
```

### Docker Configuration

The application includes a complete Docker setup:
- **docker-compose.yml**: Main orchestration file
- **PostgreSQL**: Metadata and configuration storage
- **InfluxDB**: Time-series metrics storage
- **Redis**: Session and caching layer
- **Nginx**: Reverse proxy (production)

## Monitoring Setup

### SNMP Configuration

1. **Enable SNMP on network devices:**
```bash
# Cisco IOS example
snmp-server community public RO
snmp-server community private RW
```

2. **Add devices to monitoring:**
   - Use the web interface to add devices
   - Test connectivity before saving
   - Configure polling intervals (default: 60 seconds)

### Alert Rules

Create custom alert rules based on:
- CPU utilization thresholds
- Memory usage limits
- Interface error rates
- Device availability
- Custom SNMP OID values

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check PostgreSQL service status
   - Verify connection parameters in .env
   - Ensure database exists and user has permissions

2. **SNMP Polling Issues**
   - Verify SNMP community strings
   - Check network connectivity to devices
   - Confirm SNMP version compatibility

3. **WebSocket Connection Problems**
   - Check firewall settings
   - Verify WebSocket URL configuration
   - Ensure backend service is running

### Logs

- Backend logs: `backend/logs/`
- Container logs: `docker-compose logs <service>`
- Application metrics: Available via Prometheus endpoint

## Production Deployment

### Render Deployment (Recommended)

The easiest way to deploy CloudNet Monitor to production:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/TejaswiBhavani/cloudnet-monitor)

**Quick Setup**:
1. Click the deploy button above
2. Sign up for [InfluxDB Cloud](https://cloud.influxdata.com) (free tier available)
3. Configure InfluxDB environment variables in Render
4. Access your deployed application

**Detailed Instructions**: See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)

### AWS Deployment

The application is designed for AWS deployment:

1. **Infrastructure**: VPC, ECS, RDS, ElastiCache
2. **Security**: IAM roles, Security Groups, NACLs
3. **Monitoring**: CloudWatch integration
4. **Scaling**: Auto-scaling groups, load balancers

### Security Checklist

- [ ] Change default passwords
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up firewall rules
- [ ] Enable database encryption
- [ ] Configure backup strategies
- [ ] Implement log monitoring
- [ ] Set up security scanning

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review application logs
3. Create an issue in the repository
4. Contact the development team

## License

This project is licensed under the MIT License - see the LICENSE file for details.