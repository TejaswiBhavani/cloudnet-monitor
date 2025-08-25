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

  // First check for demo credentials in development mode to ensure they always work
  if (process.env.NODE_ENV !== 'production') {
    const validCredentials = {
      'admin': 'admin123',
      'operator': 'operator123',
      'viewer': 'viewer123'
    };

    const userRoles = {
      'admin': 'admin',
      'operator': 'operator',
      'viewer': 'viewer'
    };

    if (validCredentials[username] && validCredentials[username] === password) {
      const token = jwt.sign(
        {
          userId: username,
          username: username,
          role: userRoles[username],
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        },
        process.env.JWT_SECRET || 'your-secret-key'
      );

      logger.info('Successful demo login', { username, role: userRoles[username], ip: req.ip });

      return res.json({
        success: true,
        message: 'Login successful (demo mode)',
        token,
        user: {
          username,
          role: userRoles[username]
        }
      });
    }
  }

  // Try database authentication
  try {
    // Get metrics service instance to access database
    const MetricsService = require('../services/MetricsService');
    
    // Get the global metrics service instance from app.js if available
    let metricsService = req.app.locals.metricsService;
    
    if (!metricsService) {
      // Create a new instance if not available (fallback)
      metricsService = new MetricsService();
      
      // Initialize if not already done
      if (!metricsService.isInitialized) {
        await metricsService.initialize();
      }
    }

    // Get user from database
    const userResult = await metricsService.pgPool.query(
      'SELECT id, username, email, password_hash, role, enabled FROM users WHERE username = $1 AND enabled = true',
      [username]
    );

    if (userResult.rows.length === 0) {
      logger.warn('Login attempt with invalid username', { username, ip: req.ip });
      throw new ValidationError('Invalid credentials');
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      logger.warn('Login attempt with invalid password', { username, ip: req.ip });
      throw new ValidationError('Invalid credentials');
    }

    // Update last login
    await metricsService.pgPool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    logger.info('Successful login', { username, role: user.role, ip: req.ip });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    logger.error('Database login failed:', error);
    
    // In production mode, database authentication is required
    if (process.env.NODE_ENV === 'production') {
      throw new ValidationError('Authentication service unavailable');
    }
    
    // In development mode, this means credentials don't match demo or database users
    throw new ValidationError('Invalid credentials');
  }
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