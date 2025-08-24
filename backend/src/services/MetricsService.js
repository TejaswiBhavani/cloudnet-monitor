const { Pool } = require('pg');
const { Influx } = require('influx');
const logger = require('../utils/logger');

/**
 * Metrics Service for handling time-series data and metadata
 * Implements dual-database strategy: PostgreSQL for metadata, InfluxDB for metrics
 */
class MetricsService {
  constructor() {
    this.pgPool = null;
    this.influxClient = null;
    this.metricsBuffer = [];
    this.bufferSize = 1000;
    this.flushInterval = 10000; // 10 seconds
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize PostgreSQL connection
      await this.initializePostgreSQL();
      
      // Initialize InfluxDB connection
      await this.initializeInfluxDB();
      
      // Start buffer flushing
      this.startBufferFlushing();
      
      this.isInitialized = true;
      logger.info('MetricsService initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize MetricsService:', error);
      throw error;
    }
  }

  async initializePostgreSQL() {
    const pgConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'cloudnet_monitor',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pgPool = new Pool(pgConfig);

    // Test connection
    const client = await this.pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();

    // Create tables if they don't exist
    await this.createPostgreSQLTables();
    
    logger.info('PostgreSQL connection established');
  }

  async initializeInfluxDB() {
    // Check if InfluxDB Cloud token is provided (for production)
    if (process.env.INFLUX_TOKEN) {
      await this.initializeInfluxDBv2();
    } else {
      await this.initializeInfluxDBv1();
    }
  }

  async initializeInfluxDBv1() {
    const influxConfig = {
      host: process.env.INFLUX_HOST || 'localhost',
      port: process.env.INFLUX_PORT || 8086,
      database: process.env.INFLUX_DB || 'cloudnet_metrics',
      username: process.env.INFLUX_USER || '',
      password: process.env.INFLUX_PASSWORD || '',
      schema: [
        {
          measurement: 'device_metrics',
          fields: {
            value: Influx.FieldType.FLOAT,
            string_value: Influx.FieldType.STRING
          },
          tags: [
            'device_id',
            'metric_name',
            'type',
            'interface',
            'vendor'
          ]
        },
        {
          measurement: 'interface_metrics',
          fields: {
            in_octets: Influx.FieldType.INTEGER,
            out_octets: Influx.FieldType.INTEGER,
            in_errors: Influx.FieldType.INTEGER,
            out_errors: Influx.FieldType.INTEGER,
            oper_status: Influx.FieldType.INTEGER,
            admin_status: Influx.FieldType.INTEGER,
            speed: Influx.FieldType.INTEGER
          },
          tags: [
            'device_id',
            'interface_name',
            'interface_index'
          ]
        },
        {
          measurement: 'system_metrics',
          fields: {
            cpu_utilization: Influx.FieldType.FLOAT,
            memory_used: Influx.FieldType.INTEGER,
            memory_free: Influx.FieldType.INTEGER,
            disk_used: Influx.FieldType.INTEGER,
            uptime: Influx.FieldType.INTEGER
          },
          tags: [
            'device_id',
            'vendor'
          ]
        }
      ]
    };

    this.influxClient = new Influx.InfluxDB(influxConfig);

    try {
      // Create database if it doesn't exist
      const databases = await this.influxClient.getDatabaseNames();
      if (!databases.includes(influxConfig.database)) {
        await this.influxClient.createDatabase(influxConfig.database);
        logger.info(`Created InfluxDB database: ${influxConfig.database}`);
      }
      logger.info('InfluxDB v1 connection established');
    } catch (error) {
      logger.warn('Failed to connect to InfluxDB v1, falling back to mock mode:', error.message);
      this.influxClient = null;
    }
  }

  async initializeInfluxDBv2() {
    // For InfluxDB Cloud (v2), we need different initialization
    const axios = require('axios');
    
    const influxConfig = {
      url: process.env.INFLUX_HOST,
      token: process.env.INFLUX_TOKEN,
      org: process.env.INFLUX_ORG,
      bucket: process.env.INFLUX_BUCKET || 'cloudnet_metrics'
    };

    try {
      // Test connection to InfluxDB Cloud
      const response = await axios.get(`${influxConfig.url}/health`, {
        headers: {
          'Authorization': `Token ${influxConfig.token}`
        }
      });
      
      if (response.status === 200) {
        this.influxClient = influxConfig;
        this.isInfluxDBv2 = true;
        logger.info('InfluxDB Cloud (v2) connection established');
      }
    } catch (error) {
      logger.warn('Failed to connect to InfluxDB Cloud, falling back to mock mode:', error.message);
      this.influxClient = null;
    }
  }

  async createPostgreSQLTables() {
    const queries = [
      // Devices table
      `CREATE TABLE IF NOT EXISTS devices (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        host VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        vendor VARCHAR(100),
        model VARCHAR(255),
        location VARCHAR(255),
        snmp_community VARCHAR(100),
        snmp_version INTEGER DEFAULT 2,
        snmp_port INTEGER DEFAULT 161,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Device interfaces table
      `CREATE TABLE IF NOT EXISTS device_interfaces (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) REFERENCES devices(id) ON DELETE CASCADE,
        interface_index INTEGER NOT NULL,
        interface_name VARCHAR(255) NOT NULL,
        interface_description TEXT,
        interface_type VARCHAR(100),
        mac_address VARCHAR(17),
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(device_id, interface_index)
      )`,

      // Alert rules table
      `CREATE TABLE IF NOT EXISTS alert_rules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        metric VARCHAR(255) NOT NULL,
        condition VARCHAR(50) NOT NULL,
        threshold FLOAT NOT NULL,
        severity VARCHAR(50) DEFAULT 'warning',
        device_filter JSONB,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Active alerts table
      `CREATE TABLE IF NOT EXISTS active_alerts (
        id SERIAL PRIMARY KEY,
        rule_id INTEGER REFERENCES alert_rules(id) ON DELETE CASCADE,
        device_id VARCHAR(255) REFERENCES devices(id) ON DELETE CASCADE,
        metric VARCHAR(255) NOT NULL,
        current_value FLOAT NOT NULL,
        threshold FLOAT NOT NULL,
        severity VARCHAR(50) NOT NULL,
        message TEXT,
        acknowledged BOOLEAN DEFAULT false,
        acknowledged_by VARCHAR(255),
        acknowledged_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'viewer',
        enabled BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Dashboard configurations table
      `CREATE TABLE IF NOT EXISTS dashboard_configs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        config JSONB NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_devices_host ON devices(host)`,
      `CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type)`,
      `CREATE INDEX IF NOT EXISTS idx_device_interfaces_device_id ON device_interfaces(device_id)`,
      `CREATE INDEX IF NOT EXISTS idx_active_alerts_device_id ON active_alerts(device_id)`,
      `CREATE INDEX IF NOT EXISTS idx_active_alerts_created_at ON active_alerts(created_at)`,
      
      // Create update triggers
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = CURRENT_TIMESTAMP;
         RETURN NEW;
       END;
       $$ language 'plpgsql';`,

      `DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
       CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

      `DROP TRIGGER IF EXISTS update_device_interfaces_updated_at ON device_interfaces;
       CREATE TRIGGER update_device_interfaces_updated_at BEFORE UPDATE ON device_interfaces 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

      `DROP TRIGGER IF EXISTS update_alert_rules_updated_at ON alert_rules;
       CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

      `DROP TRIGGER IF EXISTS update_users_updated_at ON users;
       CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`
    ];

    for (const query of queries) {
      await this.pgPool.query(query);
    }

    // Seed default users if they don't exist
    await this.seedDefaultUsers();

    logger.info('PostgreSQL tables created/verified');
  }

  /**
   * Seed default users for demo/production deployment
   */
  async seedDefaultUsers() {
    const bcrypt = require('bcrypt');
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;

    const defaultUsers = [
      {
        username: 'admin',
        email: 'admin@cloudnet-monitor.local',
        password: 'admin123',
        role: 'admin'
      },
      {
        username: 'operator',
        email: 'operator@cloudnet-monitor.local',
        password: 'operator123',
        role: 'operator'
      },
      {
        username: 'viewer',
        email: 'viewer@cloudnet-monitor.local',
        password: 'viewer123',
        role: 'viewer'
      }
    ];

    for (const user of defaultUsers) {
      try {
        // Check if user already exists
        const existingUser = await this.pgPool.query(
          'SELECT id FROM users WHERE username = $1',
          [user.username]
        );

        if (existingUser.rows.length === 0) {
          // Hash password and create user
          const passwordHash = await bcrypt.hash(user.password, saltRounds);
          
          await this.pgPool.query(
            'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
            [user.username, user.email, passwordHash, user.role]
          );
          
          logger.info(`Created default user: ${user.username} (${user.role})`);
        }
      } catch (error) {
        logger.warn(`Failed to create default user ${user.username}:`, error.message);
      }
    }
  }

  /**
   * Store metrics in buffer for batch processing
   */
  storeMetrics(metrics) {
    if (!Array.isArray(metrics)) {
      metrics = [metrics];
    }

    this.metricsBuffer.push(...metrics);

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.bufferSize) {
      this.flushMetricsBuffer();
    }
  }

  /**
   * Start periodic buffer flushing
   */
  startBufferFlushing() {
    setInterval(() => {
      if (this.metricsBuffer.length > 0) {
        this.flushMetricsBuffer();
      }
    }, this.flushInterval);
  }

  /**
   * Flush metrics buffer to InfluxDB
   */
  async flushMetricsBuffer() {
    if (this.metricsBuffer.length === 0 || !this.influxClient) {
      return;
    }

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      if (this.isInfluxDBv2) {
        await this.flushMetricsToInfluxDBv2(metricsToFlush);
      } else {
        await this.flushMetricsToInfluxDBv1(metricsToFlush);
      }
      logger.debug(`Flushed ${metricsToFlush.length} metrics to InfluxDB`);

    } catch (error) {
      logger.error('Failed to flush metrics to InfluxDB:', error);
      // Re-add failed metrics to buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }

  async flushMetricsToInfluxDBv1(metricsToFlush) {
    const points = metricsToFlush.map(metric => {
      const point = {
        measurement: this.getInfluxMeasurement(metric.metric),
        tags: {
          device_id: metric.deviceId,
          metric_name: metric.metric,
          ...metric.tags
        },
        fields: {},
        timestamp: metric.timestamp
      };

      // Add appropriate field based on metric type
      if (typeof metric.value === 'number') {
        point.fields.value = metric.value;
      } else {
        point.fields.string_value = String(metric.value);
      }

      return point;
    });

    await this.influxClient.writePoints(points);
  }

  async flushMetricsToInfluxDBv2(metricsToFlush) {
    const axios = require('axios');
    
    // Convert metrics to InfluxDB v2 line protocol
    const lines = metricsToFlush.map(metric => {
      const measurement = this.getInfluxMeasurement(metric.metric);
      const tags = Object.entries(metric.tags || {})
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
      const tagString = tags ? `,${tags}` : '';
      
      const field = typeof metric.value === 'number' 
        ? `value=${metric.value}`
        : `string_value="${String(metric.value)}"`;
      
      const timestamp = Math.floor(new Date(metric.timestamp).getTime() * 1000000); // nanoseconds
      
      return `${measurement},device_id=${metric.deviceId},metric_name=${metric.metric}${tagString} ${field} ${timestamp}`;
    }).join('\n');

    await axios.post(
      `${this.influxClient.url}/api/v2/write?org=${this.influxClient.org}&bucket=${this.influxClient.bucket}`,
      lines,
      {
        headers: {
          'Authorization': `Token ${this.influxClient.token}`,
          'Content-Type': 'text/plain'
        }
      }
    );
  }

  /**
   * Get appropriate InfluxDB measurement name based on metric type
   */
  getInfluxMeasurement(metricName) {
    if (metricName.includes('interface_')) {
      return 'interface_metrics';
    } else if (metricName.includes('system_') || metricName.includes('cpu_') || metricName.includes('memory_')) {
      return 'system_metrics';
    } else {
      return 'device_metrics';
    }
  }

  /**
   * Query metrics from InfluxDB
   */
  async queryMetrics(query) {
    if (!this.influxClient) {
      logger.warn('InfluxDB not available, returning mock data');
      return this.generateMockMetrics();
    }

    try {
      if (this.isInfluxDBv2) {
        return await this.queryInfluxDBv2(query);
      } else {
        const results = await this.influxClient.query(query);
        return results;
      }
    } catch (error) {
      logger.error('Failed to query InfluxDB:', error);
      // Return mock data as fallback
      return this.generateMockMetrics();
    }
  }

  async queryInfluxDBv2(fluxQuery) {
    const axios = require('axios');
    
    // Convert InfluxQL to Flux query (basic conversion)
    // This is a simplified conversion - in production you'd want more sophisticated translation
    const convertedQuery = this.convertInfluxQLToFlux(fluxQuery);
    
    const response = await axios.post(
      `${this.influxClient.url}/api/v2/query?org=${this.influxClient.org}`,
      {
        query: convertedQuery,
        type: 'flux'
      },
      {
        headers: {
          'Authorization': `Token ${this.influxClient.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/csv'
        }
      }
    );
    
    return this.parseFluxResponse(response.data);
  }

  convertInfluxQLToFlux(influxQL) {
    // Basic InfluxQL to Flux conversion
    // This is simplified - for production use, consider using the InfluxDB client library
    return `
      from(bucket: "${this.influxClient.bucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "device_metrics")
        |> last()
    `;
  }

  parseFluxResponse(csvData) {
    // Parse CSV response from Flux query
    // Return in format compatible with existing code
    return [];
  }

  generateMockMetrics() {
    // Return mock metrics data when InfluxDB is unavailable
    return [
      {
        device_id: 'router-001',
        metric_name: 'cpu_utilization',
        value: Math.random() * 100,
        time: new Date()
      },
      {
        device_id: 'switch-001',
        metric_name: 'memory_utilization',
        value: Math.random() * 100,
        time: new Date()
      }
    ];
  }

  /**
   * Get latest metrics for a device
   */
  async getLatestMetrics(deviceId, timeRange = '1h') {
    const query = `
      SELECT last("value") as value, "metric_name"
      FROM "device_metrics"
      WHERE "device_id" = '${deviceId}' AND time > now() - ${timeRange}
      GROUP BY "metric_name"
    `;

    return await this.queryMetrics(query);
  }

  /**
   * Get interface metrics for a device
   */
  async getInterfaceMetrics(deviceId, timeRange = '1h') {
    const query = `
      SELECT mean("value") as avg_value, "interface_name", "metric_name"
      FROM "device_metrics"
      WHERE "device_id" = '${deviceId}' 
        AND "type" = 'interface'
        AND time > now() - ${timeRange}
      GROUP BY time(5m), "interface_name", "metric_name"
      ORDER BY time DESC
    `;

    return await this.queryMetrics(query);
  }

  /**
   * Get aggregated metrics across all devices
   */
  async getAggregatedMetrics(timeRange = '1h') {
    const query = `
      SELECT mean("value") as avg_value, count("value") as count, "metric_name"
      FROM "device_metrics"
      WHERE time > now() - ${timeRange}
      GROUP BY time(5m), "metric_name"
      ORDER BY time DESC
    `;

    return await this.queryMetrics(query);
  }

  /**
   * PostgreSQL operations for metadata
   */

  async addDevice(device) {
    const query = `
      INSERT INTO devices (id, name, host, type, vendor, model, location, snmp_community, snmp_version, snmp_port)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        host = EXCLUDED.host,
        type = EXCLUDED.type,
        vendor = EXCLUDED.vendor,
        model = EXCLUDED.model,
        location = EXCLUDED.location,
        snmp_community = EXCLUDED.snmp_community,
        snmp_version = EXCLUDED.snmp_version,
        snmp_port = EXCLUDED.snmp_port,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      device.id,
      device.name,
      device.host,
      device.type,
      device.vendor || null,
      device.model || null,
      device.location || null,
      device.snmp_community || 'public',
      device.snmp_version || 2,
      device.snmp_port || 161
    ];

    const result = await this.pgPool.query(query, values);
    return result.rows[0];
  }

  async getDevice(deviceId) {
    const query = 'SELECT * FROM devices WHERE id = $1';
    const result = await this.pgPool.query(query, [deviceId]);
    return result.rows[0];
  }

  async getAllDevices() {
    const query = 'SELECT * FROM devices ORDER BY name';
    const result = await this.pgPool.query(query);
    return result.rows;
  }

  async removeDevice(deviceId) {
    const query = 'DELETE FROM devices WHERE id = $1 RETURNING *';
    const result = await this.pgPool.query(query, [deviceId]);
    return result.rows[0];
  }

  /**
   * Alert management
   */
  async createAlertRule(rule) {
    const query = `
      INSERT INTO alert_rules (name, description, metric, condition, threshold, severity, device_filter)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      rule.name,
      rule.description,
      rule.metric,
      rule.condition,
      rule.threshold,
      rule.severity || 'warning',
      JSON.stringify(rule.device_filter || {})
    ];

    const result = await this.pgPool.query(query, values);
    return result.rows[0];
  }

  async getActiveAlerts() {
    const query = `
      SELECT a.*, r.name as rule_name, d.name as device_name
      FROM active_alerts a
      JOIN alert_rules r ON a.rule_id = r.id
      JOIN devices d ON a.device_id = d.id
      WHERE a.acknowledged = false
      ORDER BY a.created_at DESC
    `;

    const result = await this.pgPool.query(query);
    return result.rows;
  }

  /**
   * Aggregate metrics for reporting
   */
  async aggregateMetrics() {
    try {
      // Aggregate hourly averages
      const hourlyQuery = `
        SELECT mean("value") as avg_value, "device_id", "metric_name"
        INTO "hourly_averages"
        FROM "device_metrics"
        WHERE time > now() - 1h
        GROUP BY time(1h), "device_id", "metric_name"
      `;

      await this.influxClient.query(hourlyQuery);

      // Aggregate daily averages
      const dailyQuery = `
        SELECT mean("value") as avg_value, "device_id", "metric_name"
        INTO "daily_averages"
        FROM "device_metrics"
        WHERE time > now() - 1d
        GROUP BY time(1d), "device_id", "metric_name"
      `;

      await this.influxClient.query(dailyQuery);

      logger.debug('Metrics aggregation completed');

    } catch (error) {
      logger.error('Error during metrics aggregation:', error);
    }
  }

  /**
   * Close connections
   */
  async close() {
    logger.info('Closing MetricsService connections...');
    
    // Flush remaining metrics
    await this.flushMetricsBuffer();
    
    // Close PostgreSQL pool
    if (this.pgPool) {
      await this.pgPool.end();
    }

    // Note: InfluxDB client doesn't have explicit close method
    
    logger.info('MetricsService connections closed');
  }
}

module.exports = MetricsService;