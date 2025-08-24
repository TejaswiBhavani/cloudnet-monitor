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
const errorHandler = require('./middleware/errorHandler');
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
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
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
          '/health': 'Health check',
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
      // Initialize services
      await this.metricsService.initialize();
      await this.snmpService.initialize();
      
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