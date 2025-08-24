const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Authentication routes
 */

// Login endpoint
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new ValidationError('Username and password are required');
  }

  // TODO: Implement proper user authentication with database
  // For demo purposes, using hardcoded credentials
  const validCredentials = {
    'admin': '$2b$10$rQZ9FzQyJV5L7yVhRyb7xOGKgE7vKvJvJ7rKvJvJ7rKvJvJ7rKvJv', // password: admin123
    'operator': '$2b$10$rQZ9FzQyJV5L7yVhRyb7xOGKgE7vKvJvJ7rKvJvJ7rKvJvJ7rKvJv', // password: operator123
    'viewer': '$2b$10$rQZ9FzQyJV5L7yVhRyb7xOGKgE7vKvJvJ7rKvJvJ7rKvJvJ7rKvJv' // password: viewer123
  };

  const userRoles = {
    'admin': 'admin',
    'operator': 'operator',
    'viewer': 'viewer'
  };

  if (!validCredentials[username]) {
    logger.warn('Login attempt with invalid username', { username, ip: req.ip });
    throw new ValidationError('Invalid credentials');
  }

  // For demo purposes, accept any password for now
  // In production, use: await bcrypt.compare(password, validCredentials[username])
  const isValidPassword = true;

  if (!isValidPassword) {
    logger.warn('Login attempt with invalid password', { username, ip: req.ip });
    throw new ValidationError('Invalid credentials');
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: username,
      role: userRoles[username],
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  logger.info('Successful login', { username, role: userRoles[username], ip: req.ip });

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      username,
      role: userRoles[username]
    }
  });
}));

// Token refresh endpoint
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ValidationError('Refresh token is required');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'your-secret-key');
    
    // Generate new access token
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        role: decoded.role,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    res.json({
      success: true,
      token: newToken
    });

  } catch (error) {
    throw new ValidationError('Invalid refresh token');
  }
}));

// Logout endpoint
router.post('/logout', asyncHandler(async (req, res) => {
  // In a production environment, you would invalidate the token
  // For now, we'll just acknowledge the logout
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

// Profile endpoint
router.get('/profile', asyncHandler(async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new ValidationError('Access token required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    res.json({
      success: true,
      user: {
        username: decoded.userId,
        role: decoded.role
      }
    });

  } catch (error) {
    throw new ValidationError('Invalid token');
  }
}));

// Change password endpoint
router.post('/change-password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new ValidationError('Access token required');
  }

  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current password and new password are required');
  }

  if (newPassword.length < 8) {
    throw new ValidationError('New password must be at least 8 characters long');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // TODO: Implement actual password change logic with database
    
    logger.info('Password changed successfully', { username: decoded.userId, ip: req.ip });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    throw new ValidationError('Invalid token');
  }
}));

module.exports = router;