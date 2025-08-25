// Add enhanced error handling at the very top for deployment debugging
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

console.log('Starting CloudNet Monitor backend...');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

// Import configuration and utilities
require('dotenv').config();
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

// Import routes
const deviceRoutes = require('./routes/devices');
const metricsRoutes = require('./routes/metrics');
const alertsRoutes = require('./routes/alerts');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

// Import services
const MetricsService = require('./services/MetricsService');
const SNMPService = require('./services/SNMPService');
const WebSocketService = require('./services/WebSocketService');

class NetworkMonitoringApp {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.port = process.env.PORT || 3001;
    
    // Initialize services
    this.metricsService = new MetricsService();
    this.snmpService = new SNMPService();
    this.wsService = new WebSocketService(this.server);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use('/api/', limiter);

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  setupRoutes() {
    // Simple test route for environment validation
    this.app.get('/test', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: {
          influx: !!process.env.INFLUX_HOST,
          postgres: !!process.env.POSTGRES_HOST,
          node_env: process.env.NODE_ENV
        }
      });
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Deployment status endpoint
    this.app.get('/deployment-status', (req, res) => {
      const status = {
        application: 'CloudNet Monitor',
        deployment: {
          status: 'deployed',
          platform: 'Render',
          timestamp: new Date().toISOString()
        },
        services: {
          backend: {
            status: 'healthy',
            uptime: process.uptime(),
            database: !!process.env.POSTGRES_HOST ? 'connected' : 'disconnected',
            influxdb: !!process.env.INFLUX_HOST ? 'configured' : 'not configured'
          },
          environment: {
            node_env: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0'
          }
        },
        links: {
          health: '/health',
          api: '/api',
          documentation: 'https://github.com/TejaswiBhavani/cloudnet-monitor',
          frontend: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',')[0] : 'not configured'
        },
        nextSteps: [
          'Configure InfluxDB Cloud environment variables',
          'Access frontend URL and login with default credentials',
          'Change default passwords for security',
          'Add network devices via web interface'
        ]
      };

      res.json(status);
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/devices', authenticateToken, deviceRoutes);
    this.app.use('/api/metrics', authenticateToken, metricsRoutes);
    this.app.use('/api/alerts', authenticateToken, alertsRoutes);
    this.app.use('/api/dashboard', authenticateToken, dashboardRoutes);

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'CloudNet Monitor API',
        version: '1.0.0',
        description: 'Network Monitoring Dashboard API',
        endpoints: {
          '/test': 'Environment test endpoint',
          '/health': 'Health check',
          '/deployment-status': 'Deployment status and configuration',
          '/api/auth': 'Authentication endpoints',
          '/api/devices': 'Device management',
          '/api/metrics': 'Metrics and monitoring data',
          '/api/alerts': 'Alert management',
          '/api/dashboard': 'Dashboard data aggregation'
        }
      });
    });

    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        error: 'API endpoint not found',
        path: req.originalUrl
      });
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully...');
      this.shutdown();
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.shutdown(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown(1);
    });
  }

  async start() {
    try {
      // Debug logging for environment variables
      console.log('Environment check:');
      console.log('INFLUX_HOST:', process.env.INFLUX_HOST ? 'Set' : 'Missing');
      console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST ? 'Set' : 'Missing');
      console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing');
      console.log('Database config:', {
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB
      });

      // Initialize services with error handling
      try {
        await this.metricsService.initialize();
      } catch (error) {
        logger.warn('MetricsService initialization failed, running in limited mode:', error.message);
        console.log('⚠️  MetricsService failed to initialize - running in limited mode');
      }
      
      try {
        await this.snmpService.initialize();
      } catch (error) {
        logger.warn('SNMPService initialization failed, running in limited mode:', error.message);
        console.log('⚠️  SNMPService failed to initialize - running in limited mode');
      }
      
      // Make services available to routes
      this.app.locals.metricsService = this.metricsService;
      this.app.locals.snmpService = this.snmpService;
      this.app.locals.wsService = this.wsService;
      
      // Start the server
      this.server.listen(this.port, () => {
        logger.info(`CloudNet Monitor API server running on port ${this.port}`);
        logger.info(`Health check available at: http://localhost:${this.port}/health`);
        logger.info(`API documentation at: http://localhost:${this.port}/api`);
      });

      // Start background monitoring tasks
      this.startMonitoringTasks();
      
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  startMonitoringTasks() {
    // Start SNMP polling for devices
    setInterval(async () => {
      try {
        await this.snmpService.pollAllDevices();
      } catch (error) {
        logger.error('Error in SNMP polling task:', error);
      }
    }, 60000); // Poll every minute

    // Start metrics aggregation
    setInterval(async () => {
      try {
        await this.metricsService.aggregateMetrics();
      } catch (error) {
        logger.error('Error in metrics aggregation task:', error);
      }
    }, 300000); // Aggregate every 5 minutes
  }

  async shutdown(exitCode = 0) {
    logger.info('Shutting down server...');
    
    try {
      // Close WebSocket connections
      this.wsService.close();
      
      // Close database connections
      await this.metricsService.close();
      
      // Close HTTP server
      this.server.close(() => {
        logger.info('Server shut down complete');
        process.exit(exitCode);
      });
      
      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
      
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the application
if (require.main === module) {
  const app = new NetworkMonitoringApp();
  app.start();
}

module.exports = NetworkMonitoringApp;