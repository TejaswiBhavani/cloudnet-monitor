const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const MetricsService = require('../services/MetricsService');
const SNMPService = require('../services/SNMPService');
const logger = require('../utils/logger');

const router = express.Router();
const metricsService = new MetricsService();
const snmpService = new SNMPService();

/**
 * Dashboard data aggregation routes
 */

// Get dashboard overview
router.get('/overview', asyncHandler(async (req, res) => {
  try {
    // Get device statistics
    const devicesQuery = `
      SELECT 
        type,
        COUNT(*) as count,
        COUNT(CASE WHEN enabled = true THEN 1 END) as enabled_count
      FROM devices
      GROUP BY type
    `;
    const deviceStats = await metricsService.pgPool.query(devicesQuery);

    // Get alert statistics
    const alertsQuery = `
      SELECT 
        severity,
        COUNT(*) as count
      FROM active_alerts
      WHERE acknowledged = false
      GROUP BY severity
    `;
    const alertStats = await metricsService.pgPool.query(alertsQuery);

    // Get recent metrics summary
    const metricsQuery = `
      SELECT 
        metric_name,
        COUNT(DISTINCT device_id) as device_count,
        AVG(value) as avg_value,
        MAX(value) as max_value
      FROM device_metrics 
      WHERE time > now() - 1h
        AND metric_name IN ('cpu_utilization', 'memory_utilization', 'interface_utilization')
      GROUP BY metric_name
    `;
    const recentMetrics = await metricsService.queryMetrics(metricsQuery);

    // Get device status from SNMP service
    const deviceStatuses = snmpService.getAllDevicesStatus();
    const statusCounts = deviceStatuses.reduce((acc, device) => {
      acc[device.status] = (acc[device.status] || 0) + 1;
      return acc;
    }, {});

    // Calculate system health score
    const totalDevices = deviceStatuses.length;
    const upDevices = statusCounts.up || 0;
    const healthScore = totalDevices > 0 ? Math.round((upDevices / totalDevices) * 100) : 0;

    res.json({
      success: true,
      data: {
        devices: {
          total: totalDevices,
          byType: deviceStats.rows,
          byStatus: statusCounts,
          healthScore
        },
        alerts: {
          total: alertStats.rows.reduce((sum, alert) => sum + parseInt(alert.count), 0),
          bySeverity: alertStats.rows,
          critical: alertStats.rows.find(a => a.severity === 'critical')?.count || 0,
          warning: alertStats.rows.find(a => a.severity === 'warning')?.count || 0
        },
        metrics: {
          recentSummary: recentMetrics,
          dataPointsLastHour: recentMetrics.reduce((sum, metric) => sum + parseInt(metric.device_count), 0)
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error fetching dashboard overview:', error);
    throw error;
  }
}));

// Get network topology data
router.get('/topology', asyncHandler(async (req, res) => {
  try {
    // Get all devices with their connections
    const devicesQuery = `
      SELECT 
        id,
        name,
        host,
        type,
        vendor,
        location,
        enabled
      FROM devices
      WHERE enabled = true
      ORDER BY type, name
    `;
    const devices = await metricsService.pgPool.query(devicesQuery);

    // Get device interfaces for connection mapping
    const interfacesQuery = `
      SELECT 
        device_id,
        interface_name,
        interface_description,
        enabled
      FROM device_interfaces
      WHERE enabled = true
    `;
    const interfaces = await metricsService.pgPool.query(interfacesQuery);

    // Get current device status
    const deviceStatuses = snmpService.getAllDevicesStatus();
    const statusMap = deviceStatuses.reduce((acc, device) => {
      acc[device.id] = device.status;
      return acc;
    }, {});

    // Transform devices for topology visualization
    const nodes = devices.rows.map(device => ({
      id: device.id,
      name: device.name,
      type: device.type,
      vendor: device.vendor,
      location: device.location,
      status: statusMap[device.id] || 'unknown',
      interfaces: interfaces.rows.filter(iface => iface.device_id === device.id)
    }));

    // Generate links based on network topology
    // This is a simplified approach - in a real system, you'd use LLDP/CDP data
    const links = [];
    
    // Connect routers to switches, switches to endpoints, etc.
    const routers = nodes.filter(n => n.type === 'router');
    const switches = nodes.filter(n => n.type === 'switch');
    const servers = nodes.filter(n => n.type === 'server');
    const firewalls = nodes.filter(n => n.type === 'firewall');

    // Router-to-firewall connections
    routers.forEach(router => {
      firewalls.forEach(firewall => {
        links.push({
          source: router.id,
          target: firewall.id,
          type: 'wan',
          status: router.status === 'up' && firewall.status === 'up' ? 'up' : 'down'
        });
      });
    });

    // Router-to-switch connections
    routers.forEach(router => {
      switches.slice(0, 2).forEach(sw => { // Connect to first 2 switches
        links.push({
          source: router.id,
          target: sw.id,
          type: 'lan',
          status: router.status === 'up' && sw.status === 'up' ? 'up' : 'down'
        });
      });
    });

    // Switch-to-server connections
    switches.forEach(sw => {
      servers.filter(server => 
        !server.location || server.location === sw.location
      ).forEach(server => {
        links.push({
          source: sw.id,
          target: server.id,
          type: 'access',
          status: sw.status === 'up' && server.status === 'up' ? 'up' : 'down'
        });
      });
    });

    res.json({
      success: true,
      data: {
        nodes,
        links,
        statistics: {
          totalNodes: nodes.length,
          totalLinks: links.length,
          byType: nodes.reduce((acc, node) => {
            acc[node.type] = (acc[node.type] || 0) + 1;
            return acc;
          }, {}),
          byStatus: nodes.reduce((acc, node) => {
            acc[node.status] = (acc[node.status] || 0) + 1;
            return acc;
          }, {})
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching topology data:', error);
    throw error;
  }
}));

// Get performance dashboard data
router.get('/performance', asyncHandler(async (req, res) => {
  const { timeRange = '1h' } = req.query;

  try {
    // CPU utilization trends
    const cpuQuery = `
      SELECT 
        time,
        device_id,
        mean(value) as cpu_usage
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND metric_name = 'cpu_utilization'
      GROUP BY time(5m), device_id
      ORDER BY time DESC
    `;

    // Memory utilization trends
    const memoryQuery = `
      SELECT 
        time,
        device_id,
        mean(value) as memory_usage
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND metric_name IN ('memory_utilization', 'memory_used')
      GROUP BY time(5m), device_id
      ORDER BY time DESC
    `;

    // Interface utilization
    const interfaceQuery = `
      SELECT 
        time,
        device_id,
        interface,
        mean(value) as utilization
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND metric_name LIKE '%utilization%'
        AND type = 'interface'
      GROUP BY time(5m), device_id, interface
      ORDER BY time DESC
    `;

    // Network throughput
    const throughputQuery = `
      SELECT 
        time,
        device_id,
        interface,
        mean(value) as throughput
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND metric_name IN ('interface_in_octets', 'interface_out_octets')
      GROUP BY time(5m), device_id, interface, metric_name
      ORDER BY time DESC
    `;

    const [cpuData, memoryData, interfaceData, throughputData] = await Promise.all([
      metricsService.queryMetrics(cpuQuery),
      metricsService.queryMetrics(memoryQuery),
      metricsService.queryMetrics(interfaceQuery),
      metricsService.queryMetrics(throughputQuery)
    ]);

    res.json({
      success: true,
      data: {
        timeRange,
        cpu: cpuData,
        memory: memoryData,
        interfaces: interfaceData,
        throughput: throughputData
      }
    });

  } catch (error) {
    logger.error('Error fetching performance data:', error);
    throw error;
  }
}));

// Get availability dashboard data
router.get('/availability', asyncHandler(async (req, res) => {
  const { timeRange = '24h' } = req.query;

  try {
    // Device uptime statistics
    const uptimeQuery = `
      SELECT 
        device_id,
        COUNT(*) as total_checks,
        COUNT(CASE WHEN value > 0 THEN 1 END) as successful_checks,
        MAX(value) as max_uptime
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND metric_name = 'system_uptime'
      GROUP BY device_id
    `;

    // Service availability trends
    const availabilityQuery = `
      SELECT 
        DATE_TRUNC('hour', time) as hour,
        device_id,
        COUNT(*) as checks,
        COUNT(CASE WHEN value > 0 THEN 1 END) as successful
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND metric_name = 'system_uptime'
      GROUP BY hour, device_id
      ORDER BY hour DESC
    `;

    // Interface status
    const interfaceStatusQuery = `
      SELECT 
        device_id,
        interface,
        last(value) as status
      FROM device_metrics 
      WHERE time > now() - 1h
        AND metric_name = 'interface_oper_status'
      GROUP BY device_id, interface
    `;

    const [uptimeStats, availabilityTrends, interfaceStatus] = await Promise.all([
      metricsService.queryMetrics(uptimeQuery),
      metricsService.queryMetrics(availabilityQuery),
      metricsService.queryMetrics(interfaceStatusQuery)
    ]);

    // Calculate availability percentages
    const availabilityStats = uptimeStats.map(stat => ({
      deviceId: stat.device_id,
      availability: stat.total_checks > 0 ? (stat.successful_checks / stat.total_checks * 100) : 0,
      totalChecks: stat.total_checks,
      successfulChecks: stat.successful_checks,
      maxUptime: stat.max_uptime
    }));

    res.json({
      success: true,
      data: {
        timeRange,
        availability: availabilityStats,
        trends: availabilityTrends,
        interfaces: interfaceStatus
      }
    });

  } catch (error) {
    logger.error('Error fetching availability data:', error);
    throw error;
  }
}));

// Get capacity planning data
router.get('/capacity', asyncHandler(async (req, res) => {
  const { timeRange = '7d' } = req.query;

  try {
    // CPU utilization trends for capacity planning
    const cpuTrendsQuery = `
      SELECT 
        DATE_TRUNC('day', time) as day,
        device_id,
        AVG(value) as avg_cpu,
        MAX(value) as max_cpu,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as percentile_95
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND metric_name = 'cpu_utilization'
      GROUP BY day, device_id
      ORDER BY day DESC
    `;

    // Memory utilization trends
    const memoryTrendsQuery = `
      SELECT 
        DATE_TRUNC('day', time) as day,
        device_id,
        AVG(value) as avg_memory,
        MAX(value) as max_memory,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as percentile_95
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND metric_name IN ('memory_utilization', 'memory_used')
      GROUP BY day, device_id
      ORDER BY day DESC
    `;

    // Interface utilization trends
    const interfaceTrendsQuery = `
      SELECT 
        DATE_TRUNC('day', time) as day,
        device_id,
        interface,
        AVG(value) as avg_utilization,
        MAX(value) as max_utilization,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as percentile_95
      FROM device_metrics 
      WHERE time > now() - ${timeRange}
        AND metric_name LIKE '%utilization%'
        AND type = 'interface'
      GROUP BY day, device_id, interface
      ORDER BY day DESC
    `;

    const [cpuTrends, memoryTrends, interfaceTrends] = await Promise.all([
      metricsService.queryMetrics(cpuTrendsQuery),
      metricsService.queryMetrics(memoryTrendsQuery),
      metricsService.queryMetrics(interfaceTrendsQuery)
    ]);

    // Identify capacity concerns (>80% utilization)
    const capacityConcerns = {
      cpu: cpuTrends.filter(item => item.percentile_95 > 80),
      memory: memoryTrends.filter(item => item.percentile_95 > 80),
      interfaces: interfaceTrends.filter(item => item.percentile_95 > 80)
    };

    res.json({
      success: true,
      data: {
        timeRange,
        trends: {
          cpu: cpuTrends,
          memory: memoryTrends,
          interfaces: interfaceTrends
        },
        concerns: capacityConcerns,
        summary: {
          totalConcerns: Object.values(capacityConcerns).reduce((sum, concerns) => sum + concerns.length, 0),
          highCpuDevices: capacityConcerns.cpu.length,
          highMemoryDevices: capacityConcerns.memory.length,
          highUtilizationInterfaces: capacityConcerns.interfaces.length
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching capacity data:', error);
    throw error;
  }
}));

// Get security dashboard data
router.get('/security', asyncHandler(async (req, res) => {
  try {
    // Recent security-related alerts
    const securityAlertsQuery = `
      SELECT 
        a.*,
        d.name as device_name,
        d.type as device_type
      FROM active_alerts a
      JOIN devices d ON a.device_id = d.id
      WHERE a.metric IN ('interface_errors', 'packet_loss', 'unauthorized_access')
        OR a.severity = 'critical'
      ORDER BY a.created_at DESC
      LIMIT 20
    `;

    // Failed connection attempts (mock data for demo)
    const securityEvents = [
      {
        id: 1,
        type: 'failed_snmp',
        device_id: 'router-001',
        description: 'SNMP authentication failure',
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        severity: 'warning'
      },
      {
        id: 2,
        type: 'high_error_rate',
        device_id: 'switch-001',
        description: 'Unusual error rate detected on interface',
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        severity: 'critical'
      }
    ];

    const securityAlerts = await metricsService.pgPool.query(securityAlertsQuery);

    // Device security status
    const deviceSecurityQuery = `
      SELECT 
        d.id,
        d.name,
        d.type,
        CASE 
          WHEN COUNT(a.id) = 0 THEN 'secure'
          WHEN COUNT(CASE WHEN a.severity = 'critical' THEN 1 END) > 0 THEN 'critical'
          WHEN COUNT(CASE WHEN a.severity = 'warning' THEN 1 END) > 0 THEN 'warning'
          ELSE 'info'
        END as security_status,
        COUNT(a.id) as alert_count
      FROM devices d
      LEFT JOIN active_alerts a ON d.id = a.device_id
      GROUP BY d.id, d.name, d.type
      ORDER BY alert_count DESC
    `;

    const deviceSecurity = await metricsService.pgPool.query(deviceSecurityQuery);

    res.json({
      success: true,
      data: {
        alerts: securityAlerts.rows,
        events: securityEvents,
        deviceSecurity: deviceSecurity.rows,
        summary: {
          totalAlerts: securityAlerts.rows.length,
          criticalDevices: deviceSecurity.rows.filter(d => d.security_status === 'critical').length,
          recentEvents: securityEvents.length,
          secureDevices: deviceSecurity.rows.filter(d => d.security_status === 'secure').length
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching security data:', error);
    throw error;
  }
}));

// Get reports data
router.get('/reports', asyncHandler(async (req, res) => {
  const { 
    reportType = 'summary', 
    timeRange = '24h',
    deviceId 
  } = req.query;

  try {
    let reportData = {};

    switch (reportType) {
      case 'summary':
        reportData = await generateSummaryReport(timeRange, deviceId);
        break;
      case 'performance':
        reportData = await generatePerformanceReport(timeRange, deviceId);
        break;
      case 'availability':
        reportData = await generateAvailabilityReport(timeRange, deviceId);
        break;
      case 'alerts':
        reportData = await generateAlertsReport(timeRange, deviceId);
        break;
      default:
        throw new ValidationError('Invalid report type');
    }

    res.json({
      success: true,
      data: {
        reportType,
        timeRange,
        deviceId: deviceId || 'all',
        generatedAt: new Date().toISOString(),
        ...reportData
      }
    });

  } catch (error) {
    logger.error('Error generating report:', error);
    throw error;
  }

  async function generateSummaryReport(timeRange, deviceId) {
    // Implementation would fetch and aggregate data for summary report
    return {
      summary: 'Report data would be generated here',
      devices: 15,
      alerts: 3,
      availability: 99.5
    };
  }

  async function generatePerformanceReport(timeRange, deviceId) {
    // Implementation would fetch performance metrics
    return {
      avgCpu: 45.2,
      avgMemory: 67.8,
      peakUtilization: 89.1
    };
  }

  async function generateAvailabilityReport(timeRange, deviceId) {
    // Implementation would calculate availability statistics
    return {
      overallAvailability: 99.2,
      downtimeMinutes: 11.5,
      mtbf: 720 // hours
    };
  }

  async function generateAlertsReport(timeRange, deviceId) {
    // Implementation would summarize alert data
    return {
      totalAlerts: 25,
      criticalAlerts: 2,
      resolvedAlerts: 22
    };
  }
}));

module.exports = router;