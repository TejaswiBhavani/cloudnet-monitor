const logger = require('../utils/logger');

/**
 * Centralized error handling middleware for Express
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Joi validation errors
    statusCode = 400;
    message = 'Validation Error';
    const errors = Object.values(err.details || {}).map(detail => detail.message);
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: errors
    });
  }

  if (err.name === 'UnauthorizedError' || err.message === 'Unauthorized') {
    statusCode = 401;
    message = 'Unauthorized';
  }

  if (err.name === 'ForbiddenError' || err.message === 'Forbidden') {
    statusCode = 403;
    message = 'Forbidden';
  }

  if (err.name === 'NotFoundError' || err.message === 'Not Found') {
    statusCode = 404;
    message = 'Resource Not Found';
  }

  if (err.name === 'ConflictError' || err.message === 'Conflict') {
    statusCode = 409;
    message = 'Resource Conflict';
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'Service Unavailable';
  }

  // Database errors
  if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'Resource already exists';
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Invalid reference';
  }

  // SNMP errors
  if (err.message && err.message.includes('SNMP')) {
    statusCode = 503;
    message = 'SNMP Service Error';
  }

  // Rate limiting errors
  if (err.message && err.message.includes('Too many requests')) {
    statusCode = 429;
    message = 'Too Many Requests';
  }

  // Send error response
  const errorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    };
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Handle async errors in route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Create custom error classes
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
};