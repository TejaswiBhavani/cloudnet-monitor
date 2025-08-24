const express = require('express');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const MetricsService = require('../services/MetricsService');
const logger = require('../utils/logger');

const router = express.Router();
const metricsService = new MetricsService();

/**
 * Metrics routes for querying time-series data
 */

// Get aggregated metrics across all devices
router.get('/', asyncHandler(async (req, res) => {
  const { 
    timeRange = '1h', 
    metric, 
    aggregation = 'mean',
    interval = '5m',
    deviceId,
    deviceType
  } = req.query;

  try {
    let whereClause = `time > now() - ${timeRange}`;
    
    if (metric) {
      whereClause += ` AND metric_name = '${metric}'`;
    }
    
    if (deviceId) {
      whereClause += ` AND device_id = '${deviceId}'`;
    }
    
    if (deviceType) {
      whereClause += ` AND type = '${deviceType}'`;
    }

    const query = `
      SELECT 
        ${aggregation}(value) as value,
        metric_name,
        time
      FROM device_metrics 
      WHERE ${whereClause}
      GROUP BY time(${interval}), metric_name
      ORDER BY time DESC
    `;

    const metrics = await metricsService.queryMetrics(query);

    res.json({
      success: true,
      data: {
        timeRange,
        interval,
        aggregation,
        filters: { metric, deviceId, deviceType },
        metrics
      }
    });

  } catch (error) {
    logger.error('Error fetching aggregated metrics:', error);
    throw error;
  }
}));

// Get real-time metrics summary
router.get('/realtime', asyncHandler(async (req, res) => {
  try {
    // Get latest metrics for all devices
    const query = `
      SELECT 
        device_id,
        metric_name,
        last(value) as current_value,
        time as last_update
      FROM device_metrics 
      WHERE time > now() - 5m
      GROUP BY device_id, metric_name
    `;

    const realtimeMetrics = await metricsService.queryMetrics(query);

    // Group by device
    const deviceMetrics = {};
    realtimeMetrics.forEach(metric => {
      if (!deviceMetrics[metric.device_id]) {
        deviceMetrics[metric.device_id] = {};
      }
      deviceMetrics[metric.device_id][metric.metric_name] = {
        value: metric.current_value,
        lastUpdate: metric.last_update
      };
    });

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        devices: deviceMetrics
      }
    });

  } catch (error) {
    logger.error('Error fetching real-time metrics:', error);
    throw error;
  }
}));

// Get metrics by time series
router.get('/timeseries', asyncHandler(async (req, res) => {
  const { 
    metric, 
    deviceId, 
    timeRange = '1h', 
    interval = '1m' 
  } = req.query;

  if (!metric) {
    throw new ValidationError('Metric parameter is required');
  }

  try {
    let whereClause = `time > now() - ${timeRange} AND metric_name = '${metric}'`;
    
    if (deviceId) {
      whereClause += ` AND device_id = '${deviceId}'`;
    }

    const query = `
      SELECT 
        time,
        device_id,
        mean(value) as value
      FROM device_metrics 
      WHERE ${whereClause}
      GROUP BY time(${interval}), device_id
      ORDER BY time DESC
    `;

    const timeseries = await metricsService.queryMetrics(query);

    res.json({
      success: true,
      data: {
        metric,
        deviceId: deviceId || 'all',
        timeRange,
        interval,
        timeseries
      }
    });

  } catch (error) {
    logger.error('Error fetching time series metrics:', error);
    throw error;
  }
}));

// Get top devices by metric
router.get('/top', asyncHandler(async (req, res) => {
  const { 
    metric, 
    limit = 10, 
    timeRange = '1h',
    order = 'desc' 
  } = req.query;

  if (!metric) {
    throw new ValidationError('Metric parameter is required');
  }

  try {
    const orderDirection = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    const query = `
      SELECT 
        device_id,
        mean(value) as avg_value,
        max(value) as max_value,
        min(value) as min_value,
        count(value) as data_points
      FROM device_metrics 
      WHERE time > now() - ${timeRange} 
        AND metric_name = '${metric}'
        AND value IS NOT NULL
      GROUP BY device_id
      ORDER BY avg_value ${orderDirection}
      LIMIT ${limit}
    `;

    const topDevices = await metricsService.queryMetrics(query);

    res.json({
      success: true,
      data: {
        metric,
        timeRange,
        limit: parseInt(limit),
        order,
        devices: topDevices
      }
    });

  } catch (error) {
    logger.error('Error fetching top devices metrics:', error);
    throw error;
  }
}));

// Get metrics comparison between devices
router.get('/compare', asyncHandler(async (req, res) => {
  const { 
    deviceIds, 
    metric, 
    timeRange = '1h', 
    interval = '5m' 
  } = req.query;

  if (!deviceIds || !metric) {
    throw new ValidationError('deviceIds and metric parameters are required');
  }

  const deviceList = deviceIds.split(',').map(id => `'${id.trim()}'`).join(',');

  try {
    const query = `
      SELECT 
        time,
        device_id,
        mean(value) as value
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND metric_name = '${metric}'
        AND device_id IN (${deviceList})
      GROUP BY time(${interval}), device_id
      ORDER BY time DESC, device_id
    `;

    const comparison = await metricsService.queryMetrics(query);

    res.json({
      success: true,
      data: {
        metric,
        devices: deviceIds.split(',').map(id => id.trim()),
        timeRange,
        interval,
        comparison
      }
    });

  } catch (error) {
    logger.error('Error fetching metrics comparison:', error);
    throw error;
  }
}));

// Get interface utilization metrics
router.get('/interfaces', asyncHandler(async (req, res) => {
  const { 
    deviceId, 
    timeRange = '1h', 
    threshold = 80 
  } = req.query;

  try {
    let whereClause = `time > now() - ${timeRange} AND type = 'interface'`;
    
    if (deviceId) {
      whereClause += ` AND device_id = '${deviceId}'`;
    }

    const query = `
      SELECT 
        device_id,
        interface as interface_name,
        metric_name,
        mean(value) as avg_value,
        max(value) as max_value,
        percentile(value, 95) as percentile_95
      FROM device_metrics 
      WHERE ${whereClause}
        AND (metric_name LIKE '%utilization%' OR metric_name LIKE '%octets%')
      GROUP BY device_id, interface, metric_name
      ORDER BY avg_value DESC
    `;

    const interfaces = await metricsService.queryMetrics(query);

    // Filter high utilization interfaces
    const highUtilization = interfaces.filter(iface => 
      iface.avg_value > threshold && iface.metric_name.includes('utilization')
    );

    res.json({
      success: true,
      data: {
        deviceId: deviceId || 'all',
        timeRange,
        threshold,
        interfaces,
        highUtilization
      }
    });

  } catch (error) {
    logger.error('Error fetching interface metrics:', error);
    throw error;
  }
}));

// Get system health metrics
router.get('/health', asyncHandler(async (req, res) => {
  const { timeRange = '1h' } = req.query;

  try {
    // CPU utilization
    const cpuQuery = `
      SELECT 
        device_id,
        mean(value) as avg_cpu,
        max(value) as max_cpu
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND metric_name = 'cpu_utilization'
      GROUP BY device_id
    `;

    // Memory utilization
    const memoryQuery = `
      SELECT 
        device_id,
        mean(value) as avg_memory,
        max(value) as max_memory
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND metric_name IN ('memory_used', 'memory_utilization')
      GROUP BY device_id
    `;

    // Device availability
    const availabilityQuery = `
      SELECT 
        device_id,
        count(*) as total_polls,
        count(value) as successful_polls
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND metric_name = 'system_uptime'
      GROUP BY device_id
    `;

    const [cpuMetrics, memoryMetrics, availability] = await Promise.all([
      metricsService.queryMetrics(cpuQuery),
      metricsService.queryMetrics(memoryQuery),
      metricsService.queryMetrics(availabilityQuery)
    ]);

    // Combine health metrics
    const healthMetrics = {};
    
    cpuMetrics.forEach(metric => {
      healthMetrics[metric.device_id] = {
        ...healthMetrics[metric.device_id],
        cpu: {
          average: metric.avg_cpu,
          maximum: metric.max_cpu
        }
      };
    });

    memoryMetrics.forEach(metric => {
      healthMetrics[metric.device_id] = {
        ...healthMetrics[metric.device_id],
        memory: {
          average: metric.avg_memory,
          maximum: metric.max_memory
        }
      };
    });

    availability.forEach(metric => {
      const availabilityPercent = (metric.successful_polls / metric.total_polls) * 100;
      healthMetrics[metric.device_id] = {
        ...healthMetrics[metric.device_id],
        availability: {
          percentage: availabilityPercent,
          totalPolls: metric.total_polls,
          successfulPolls: metric.successful_polls
        }
      };
    });

    res.json({
      success: true,
      data: {
        timeRange,
        health: healthMetrics
      }
    });

  } catch (error) {
    logger.error('Error fetching health metrics:', error);
    throw error;
  }
}));

// Get metrics statistics
router.get('/stats', asyncHandler(async (req, res) => {
  const { timeRange = '24h' } = req.query;

  try {
    // Overall statistics
    const statsQuery = `
      SELECT 
        metric_name,
        count(*) as total_data_points,
        count(distinct device_id) as device_count,
        mean(value) as avg_value,
        stddev(value) as std_deviation,
        min(value) as min_value,
        max(value) as max_value
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND value IS NOT NULL
      GROUP BY metric_name
      ORDER BY total_data_points DESC
    `;

    const stats = await metricsService.queryMetrics(statsQuery);

    // Data collection rate
    const collectionRateQuery = `
      SELECT 
        count(*) as total_metrics,
        count(distinct device_id) as active_devices,
        count(*) / extract(epoch from interval '${timeRange}') * 3600 as metrics_per_hour
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
    `;

    const collectionRate = await metricsService.queryMetrics(collectionRateQuery);

    res.json({
      success: true,
      data: {
        timeRange,
        statistics: stats,
        collectionRate: collectionRate[0] || {}
      }
    });

  } catch (error) {
    logger.error('Error fetching metrics statistics:', error);
    throw error;
  }
}));

// Custom query endpoint (admin only)
router.post('/query', asyncHandler(async (req, res) => {
  const { query } = req.body;

  if (!query) {
    throw new ValidationError('Query parameter is required');
  }

  // Basic security: only allow SELECT queries
  if (!query.trim().toLowerCase().startsWith('select')) {
    throw new ValidationError('Only SELECT queries are allowed');
  }

  try {
    const results = await metricsService.queryMetrics(query);

    res.json({
      success: true,
      data: {
        query,
        results
      }
    });

  } catch (error) {
    logger.error('Error executing custom query:', error);
    throw error;
  }
}));

module.exports = router;