const express = require('express');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const MetricsService = require('../services/MetricsService');
const SNMPService = require('../services/SNMPService');
const logger = require('../utils/logger');

const router = express.Router();
const metricsService = new MetricsService();
const snmpService = new SNMPService();

/**
 * Device management routes
 */

// Get all devices
router.get('/', asyncHandler(async (req, res) => {
  const devices = await metricsService.getAllDevices();
  const devicesWithStatus = devices.map(device => {
    const status = snmpService.getDeviceStatus(device.id);
    return {
      ...device,
      status: status?.status || 'unknown',
      lastPoll: status?.lastPoll || null,
      lastError: status?.lastError || null
    };
  });

  res.json({
    success: true,
    data: devicesWithStatus,
    count: devicesWithStatus.length
  });
}));

// Get device by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const device = await metricsService.getDevice(id);
  
  if (!device) {
    throw new NotFoundError(`Device ${id} not found`);
  }

  const status = snmpService.getDeviceStatus(id);
  
  res.json({
    success: true,
    data: {
      ...device,
      status: status?.status || 'unknown',
      lastPoll: status?.lastPoll || null,
      lastError: status?.lastError || null
    }
  });
}));

// Add new device
router.post('/', asyncHandler(async (req, res) => {
  const {
    id,
    name,
    host,
    type,
    vendor,
    model,
    location,
    snmp_community = 'public',
    snmp_version = 2,
    snmp_port = 161,
    poll_interval = 60000
  } = req.body;

  // Validation
  if (!id || !name || !host || !type) {
    throw new ValidationError('Device ID, name, host, and type are required');
  }

  // Validate host format (IP address or hostname)
  const hostRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!hostRegex.test(host)) {
    throw new ValidationError('Invalid host format');
  }

  // Validate device type
  const validTypes = ['router', 'switch', 'firewall', 'server', 'printer', 'ups', 'wireless_controller', 'access_point'];
  if (!validTypes.includes(type)) {
    throw new ValidationError(`Device type must be one of: ${validTypes.join(', ')}`);
  }

  try {
    // Add device to database
    const device = await metricsService.addDevice({
      id,
      name,
      host,
      type,
      vendor,
      model,
      location,
      snmp_community,
      snmp_version,
      snmp_port
    });

    // Add device to SNMP monitoring
    snmpService.addDevice({
      id,
      host,
      community: snmp_community,
      version: snmp_version,
      port: snmp_port,
      pollInterval: poll_interval,
      vendor
    });

    logger.info(`Added new device: ${id} (${name})`, { 
      deviceId: id, 
      host, 
      type, 
      user: req.user?.userId 
    });

    res.status(201).json({
      success: true,
      message: 'Device added successfully',
      data: device
    });

  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      throw new ValidationError(`Device with ID '${id}' already exists`);
    }
    throw error;
  }
}));

// Update device
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const existingDevice = await metricsService.getDevice(id);
  
  if (!existingDevice) {
    throw new NotFoundError(`Device ${id} not found`);
  }

  try {
    // Update device in database
    const updatedDevice = await metricsService.addDevice({
      ...existingDevice,
      ...updates,
      id // Ensure ID doesn't change
    });

    // Update SNMP monitoring if connection details changed
    if (updates.host || updates.snmp_community || updates.snmp_version || updates.snmp_port) {
      snmpService.removeDevice(id);
      snmpService.addDevice({
        id,
        host: updates.host || existingDevice.host,
        community: updates.snmp_community || existingDevice.snmp_community,
        version: updates.snmp_version || existingDevice.snmp_version,
        port: updates.snmp_port || existingDevice.snmp_port,
        vendor: updates.vendor || existingDevice.vendor
      });
    }

    logger.info(`Updated device: ${id}`, { 
      deviceId: id, 
      updates: Object.keys(updates), 
      user: req.user?.userId 
    });

    res.json({
      success: true,
      message: 'Device updated successfully',
      data: updatedDevice
    });

  } catch (error) {
    throw error;
  }
}));

// Delete device
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const device = await metricsService.getDevice(id);
  
  if (!device) {
    throw new NotFoundError(`Device ${id} not found`);
  }

  try {
    // Remove from SNMP monitoring
    snmpService.removeDevice(id);

    // Remove from database
    await metricsService.removeDevice(id);

    logger.info(`Deleted device: ${id}`, { 
      deviceId: id, 
      user: req.user?.userId 
    });

    res.json({
      success: true,
      message: 'Device deleted successfully'
    });

  } catch (error) {
    throw error;
  }
}));

// Get device metrics
router.get('/:id/metrics', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { timeRange = '1h', metric } = req.query;

  const device = await metricsService.getDevice(id);
  
  if (!device) {
    throw new NotFoundError(`Device ${id} not found`);
  }

  try {
    let metrics;
    
    if (metric) {
      // Get specific metric
      const query = `
        SELECT time, value 
        FROM device_metrics 
        WHERE device_id = '${id}' 
          AND metric_name = '${metric}' 
          AND time > now() - ${timeRange}
        ORDER BY time DESC
      `;
      metrics = await metricsService.queryMetrics(query);
    } else {
      // Get latest metrics for all types
      metrics = await metricsService.getLatestMetrics(id, timeRange);
    }

    res.json({
      success: true,
      data: {
        deviceId: id,
        timeRange,
        metrics
      }
    });

  } catch (error) {
    logger.error(`Error fetching metrics for device ${id}:`, error);
    throw error;
  }
}));

// Get device interfaces
router.get('/:id/interfaces', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { timeRange = '1h' } = req.query;

  const device = await metricsService.getDevice(id);
  
  if (!device) {
    throw new NotFoundError(`Device ${id} not found`);
  }

  try {
    const interfaceMetrics = await metricsService.getInterfaceMetrics(id, timeRange);

    res.json({
      success: true,
      data: {
        deviceId: id,
        timeRange,
        interfaces: interfaceMetrics
      }
    });

  } catch (error) {
    logger.error(`Error fetching interface metrics for device ${id}:`, error);
    throw error;
  }
}));

// Test device connectivity
router.post('/:id/test', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const device = await metricsService.getDevice(id);
  
  if (!device) {
    throw new NotFoundError(`Device ${id} not found`);
  }

  try {
    // Perform a test poll
    await snmpService.pollDevice(id);

    res.json({
      success: true,
      message: 'Device connectivity test successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Device connectivity test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

// Get device statistics
router.get('/:id/stats', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { period = '24h' } = req.query;

  const device = await metricsService.getDevice(id);
  
  if (!device) {
    throw new NotFoundError(`Device ${id} not found`);
  }

  try {
    // Calculate device statistics
    const query = `
      SELECT 
        metric_name,
        COUNT(*) as data_points,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        STDDEV(value) as std_dev
      FROM device_metrics 
      WHERE device_id = '${id}' 
        AND time > now() - ${period}
        AND value IS NOT NULL
      GROUP BY metric_name
    `;

    const stats = await metricsService.queryMetrics(query);

    res.json({
      success: true,
      data: {
        deviceId: id,
        period,
        statistics: stats
      }
    });

  } catch (error) {
    logger.error(`Error fetching statistics for device ${id}:`, error);
    throw error;
  }
}));

module.exports = router;