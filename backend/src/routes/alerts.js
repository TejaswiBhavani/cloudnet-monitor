const express = require('express');
const { asyncHandler, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const MetricsService = require('../services/MetricsService');
const logger = require('../utils/logger');

const router = express.Router();
const metricsService = new MetricsService();

/**
 * Alert management routes
 */

// Get all alert rules
router.get('/rules', asyncHandler(async (req, res) => {
  const query = `
    SELECT 
      id,
      name,
      description,
      metric,
      condition,
      threshold,
      severity,
      device_filter,
      enabled,
      created_at,
      updated_at
    FROM alert_rules 
    ORDER BY created_at DESC
  `;

  const rules = await metricsService.pgPool.query(query);

  res.json({
    success: true,
    data: rules.rows,
    count: rules.rows.length
  });
}));

// Get alert rule by ID
router.get('/rules/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const query = 'SELECT * FROM alert_rules WHERE id = $1';
  const result = await metricsService.pgPool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError(`Alert rule ${id} not found`);
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
}));

// Create new alert rule
router.post('/rules', asyncHandler(async (req, res) => {
  const {
    name,
    description,
    metric,
    condition,
    threshold,
    severity = 'warning',
    device_filter = {}
  } = req.body;

  // Validation
  if (!name || !metric || !condition || threshold === undefined) {
    throw new ValidationError('Name, metric, condition, and threshold are required');
  }

  const validConditions = ['>', '<', '>=', '<=', '==', '!='];
  if (!validConditions.includes(condition)) {
    throw new ValidationError(`Condition must be one of: ${validConditions.join(', ')}`);
  }

  const validSeverities = ['info', 'warning', 'critical'];
  if (!validSeverities.includes(severity)) {
    throw new ValidationError(`Severity must be one of: ${validSeverities.join(', ')}`);
  }

  try {
    const rule = await metricsService.createAlertRule({
      name,
      description,
      metric,
      condition,
      threshold: parseFloat(threshold),
      severity,
      device_filter
    });

    logger.info(`Created alert rule: ${name}`, { 
      ruleId: rule.id, 
      metric, 
      condition, 
      threshold,
      user: req.user?.userId 
    });

    res.status(201).json({
      success: true,
      message: 'Alert rule created successfully',
      data: rule
    });

  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      throw new ValidationError(`Alert rule with name '${name}' already exists`);
    }
    throw error;
  }
}));

// Update alert rule
router.put('/rules/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Check if rule exists
  const existingQuery = 'SELECT * FROM alert_rules WHERE id = $1';
  const existingResult = await metricsService.pgPool.query(existingQuery, [id]);

  if (existingResult.rows.length === 0) {
    throw new NotFoundError(`Alert rule ${id} not found`);
  }

  // Validation for updates
  if (updates.condition) {
    const validConditions = ['>', '<', '>=', '<=', '==', '!='];
    if (!validConditions.includes(updates.condition)) {
      throw new ValidationError(`Condition must be one of: ${validConditions.join(', ')}`);
    }
  }

  if (updates.severity) {
    const validSeverities = ['info', 'warning', 'critical'];
    if (!validSeverities.includes(updates.severity)) {
      throw new ValidationError(`Severity must be one of: ${validSeverities.join(', ')}`);
    }
  }

  try {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'created_at') {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(key === 'device_filter' ? JSON.stringify(updates[key]) : updates[key]);
        paramIndex++;
      }
    });

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    const updateQuery = `
      UPDATE alert_rules 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await metricsService.pgPool.query(updateQuery, updateValues);

    logger.info(`Updated alert rule: ${id}`, { 
      ruleId: id, 
      updates: Object.keys(updates),
      user: req.user?.userId 
    });

    res.json({
      success: true,
      message: 'Alert rule updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    throw error;
  }
}));

// Delete alert rule
router.delete('/rules/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleteQuery = 'DELETE FROM alert_rules WHERE id = $1 RETURNING *';
  const result = await metricsService.pgPool.query(deleteQuery, [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError(`Alert rule ${id} not found`);
  }

  logger.info(`Deleted alert rule: ${id}`, { 
    ruleId: id, 
    user: req.user?.userId 
  });

  res.json({
    success: true,
    message: 'Alert rule deleted successfully'
  });
}));

// Get active alerts
router.get('/', asyncHandler(async (req, res) => {
  const { severity, deviceId, acknowledged } = req.query;

  let whereClause = 'WHERE 1=1';
  const queryParams = [];

  if (severity) {
    whereClause += ` AND a.severity = $${queryParams.length + 1}`;
    queryParams.push(severity);
  }

  if (deviceId) {
    whereClause += ` AND a.device_id = $${queryParams.length + 1}`;
    queryParams.push(deviceId);
  }

  if (acknowledged !== undefined) {
    whereClause += ` AND a.acknowledged = $${queryParams.length + 1}`;
    queryParams.push(acknowledged === 'true');
  }

  const alertsQuery = `
    SELECT 
      a.*,
      r.name as rule_name,
      d.name as device_name,
      d.host as device_host,
      d.type as device_type
    FROM active_alerts a
    JOIN alert_rules r ON a.rule_id = r.id
    JOIN devices d ON a.device_id = d.id
    ${whereClause}
    ORDER BY a.created_at DESC
  `;

  const alerts = await metricsService.pgPool.query(alertsQuery, queryParams);

  res.json({
    success: true,
    data: alerts.rows,
    count: alerts.rows.length
  });
}));

// Get alert by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const alertQuery = `
    SELECT 
      a.*,
      r.name as rule_name,
      r.description as rule_description,
      d.name as device_name,
      d.host as device_host,
      d.type as device_type
    FROM active_alerts a
    JOIN alert_rules r ON a.rule_id = r.id
    JOIN devices d ON a.device_id = d.id
    WHERE a.id = $1
  `;

  const result = await metricsService.pgPool.query(alertQuery, [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError(`Alert ${id} not found`);
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
}));

// Acknowledge alert
router.post('/:id/acknowledge', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  const updateQuery = `
    UPDATE active_alerts 
    SET 
      acknowledged = true,
      acknowledged_by = $1,
      acknowledged_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND acknowledged = false
    RETURNING *
  `;

  const result = await metricsService.pgPool.query(updateQuery, [req.user?.userId || 'system', id]);

  if (result.rows.length === 0) {
    throw new NotFoundError(`Alert ${id} not found or already acknowledged`);
  }

  logger.info(`Alert acknowledged: ${id}`, { 
    alertId: id, 
    acknowledgedBy: req.user?.userId,
    comment
  });

  res.json({
    success: true,
    message: 'Alert acknowledged successfully',
    data: result.rows[0]
  });
}));

// Clear/resolve alert
router.post('/:id/resolve', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  const deleteQuery = 'DELETE FROM active_alerts WHERE id = $1 RETURNING *';
  const result = await metricsService.pgPool.query(deleteQuery, [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError(`Alert ${id} not found`);
  }

  logger.info(`Alert resolved: ${id}`, { 
    alertId: id, 
    resolvedBy: req.user?.userId,
    comment
  });

  res.json({
    success: true,
    message: 'Alert resolved successfully'
  });
}));

// Get alert statistics
router.get('/stats/summary', asyncHandler(async (req, res) => {
  const { timeRange = '24h' } = req.query;

  try {
    // Current active alerts by severity
    const severityQuery = `
      SELECT 
        severity,
        COUNT(*) as count
      FROM active_alerts
      GROUP BY severity
    `;

    // Alert trends over time
    const trendsQuery = `
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        severity,
        COUNT(*) as count
      FROM active_alerts
      WHERE created_at > NOW() - INTERVAL '${timeRange}'
      GROUP BY hour, severity
      ORDER BY hour DESC
    `;

    // Top devices with most alerts
    const topDevicesQuery = `
      SELECT 
        a.device_id,
        d.name as device_name,
        COUNT(*) as alert_count
      FROM active_alerts a
      JOIN devices d ON a.device_id = d.id
      WHERE a.created_at > NOW() - INTERVAL '${timeRange}'
      GROUP BY a.device_id, d.name
      ORDER BY alert_count DESC
      LIMIT 10
    `;

    // Most common alert metrics
    const topMetricsQuery = `
      SELECT 
        metric,
        COUNT(*) as count
      FROM active_alerts
      WHERE created_at > NOW() - INTERVAL '${timeRange}'
      GROUP BY metric
      ORDER BY count DESC
      LIMIT 10
    `;

    const [severityStats, trends, topDevices, topMetrics] = await Promise.all([
      metricsService.pgPool.query(severityQuery),
      metricsService.pgPool.query(trendsQuery),
      metricsService.pgPool.query(topDevicesQuery),
      metricsService.pgPool.query(topMetricsQuery)
    ]);

    res.json({
      success: true,
      data: {
        timeRange,
        summary: {
          bySeverity: severityStats.rows,
          trends: trends.rows,
          topDevices: topDevices.rows,
          topMetrics: topMetrics.rows
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching alert statistics:', error);
    throw error;
  }
}));

// Test alert rule
router.post('/rules/:id/test', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ruleQuery = 'SELECT * FROM alert_rules WHERE id = $1';
  const ruleResult = await metricsService.pgPool.query(ruleQuery, [id]);

  if (ruleResult.rows.length === 0) {
    throw new NotFoundError(`Alert rule ${id} not found`);
  }

  const rule = ruleResult.rows[0];

  try {
    // Test the rule against current metrics
    const testQuery = `
      SELECT 
        device_id,
        last(value) as current_value
      FROM device_metrics 
      WHERE time > now() - 5m
        AND metric_name = '${rule.metric}'
      GROUP BY device_id
    `;

    const testResults = await metricsService.queryMetrics(testQuery);

    // Check which devices would trigger the alert
    const triggeredDevices = testResults.filter(result => {
      const value = parseFloat(result.current_value);
      const threshold = parseFloat(rule.threshold);
      
      switch (rule.condition) {
        case '>': return value > threshold;
        case '<': return value < threshold;
        case '>=': return value >= threshold;
        case '<=': return value <= threshold;
        case '==': return value === threshold;
        case '!=': return value !== threshold;
        default: return false;
      }
    });

    res.json({
      success: true,
      data: {
        rule: {
          id: rule.id,
          name: rule.name,
          metric: rule.metric,
          condition: rule.condition,
          threshold: rule.threshold
        },
        testResults: {
          totalDevices: testResults.length,
          triggeredDevices: triggeredDevices.length,
          devices: triggeredDevices
        }
      }
    });

  } catch (error) {
    logger.error(`Error testing alert rule ${id}:`, error);
    throw error;
  }
}));

module.exports = router;