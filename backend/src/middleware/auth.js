const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * JWT Authentication middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(new UnauthorizedError('Access token required'));
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      logger.warn('Invalid token attempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: err.message
      });
      return next(new UnauthorizedError('Invalid or expired token'));
    }

    req.user = user;
    next();
  });
};

/**
 * Role-based authorization middleware
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * API Key authentication middleware (for automated systems)
 */
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return next(new UnauthorizedError('API key required'));
  }

  // Validate API key (implement your validation logic)
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    logger.warn('Invalid API key attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      apiKey: apiKey.substring(0, 8) + '...'
    });
    return next(new UnauthorizedError('Invalid API key'));
  }

  // Set a default user for API key authentication
  req.user = {
    id: 'api-key-user',
    role: 'api',
    authMethod: 'api-key'
  };

  next();
};

/**
 * Optional authentication middleware (allows both authenticated and anonymous access)
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without authentication
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};

module.exports = {
  authenticateToken,
  requireRole,
  authenticateApiKey,
  optionalAuth
};