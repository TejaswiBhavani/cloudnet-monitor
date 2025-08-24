const snmp = require('net-snmp');
const logger = require('../utils/logger');
const MetricsService = require('./MetricsService');

/**
 * SNMP Service for network device monitoring
 * Implements comprehensive SNMP polling for routers, switches, and other network devices
 */
class SNMPService {
  constructor() {
    this.sessions = new Map(); // Store SNMP sessions by device ID
    this.devices = new Map(); // Store device configurations
    this.pollingIntervals = new Map(); // Store polling interval timers
    this.metricsService = new MetricsService();
    
    // Common SNMP OIDs for network monitoring
    this.commonOIDs = {
      // System information
      sysDescr: '1.3.6.1.2.1.1.1.0',
      sysUpTime: '1.3.6.1.2.1.1.3.0',
      sysContact: '1.3.6.1.2.1.1.4.0',
      sysName: '1.3.6.1.2.1.1.5.0',
      sysLocation: '1.3.6.1.2.1.1.6.0',
      
      // Interface statistics
      ifNumber: '1.3.6.1.2.1.2.1.0',
      ifTable: '1.3.6.1.2.1.2.2.1',
      ifIndex: '1.3.6.1.2.1.2.2.1.1',
      ifDescr: '1.3.6.1.2.1.2.2.1.2',
      ifType: '1.3.6.1.2.1.2.2.1.3',
      ifMtu: '1.3.6.1.2.1.2.2.1.4',
      ifSpeed: '1.3.6.1.2.1.2.2.1.5',
      ifPhysAddress: '1.3.6.1.2.1.2.2.1.6',
      ifAdminStatus: '1.3.6.1.2.1.2.2.1.7',
      ifOperStatus: '1.3.6.1.2.1.2.2.1.8',
      ifInOctets: '1.3.6.1.2.1.2.2.1.10',
      ifInUcastPkts: '1.3.6.1.2.1.2.2.1.11',
      ifInErrors: '1.3.6.1.2.1.2.2.1.14',
      ifOutOctets: '1.3.6.1.2.1.2.2.1.16',
      ifOutUcastPkts: '1.3.6.1.2.1.2.2.1.17',
      ifOutErrors: '1.3.6.1.2.1.2.2.1.20',
      
      // CPU and Memory (vary by vendor)
      hrProcessorLoad: '1.3.6.1.2.1.25.3.3.1.2', // Host Resources MIB
      hrMemorySize: '1.3.6.1.2.1.25.2.2.0',
      hrStorageTable: '1.3.6.1.2.1.25.2.3.1',
      
      // Cisco specific
      cpmCPUTotal5minRev: '1.3.6.1.4.1.9.9.109.1.1.1.1.8',
      ciscoMemoryPoolUsed: '1.3.6.1.4.1.9.9.48.1.1.1.5',
      ciscoMemoryPoolFree: '1.3.6.1.4.1.9.9.48.1.1.1.6'
    };
  }

  async initialize() {
    logger.info('Initializing SNMP Service...');
    await this.metricsService.initialize();
    logger.info('SNMP Service initialized successfully');
  }

  /**
   * Add a device for SNMP monitoring
   */
  addDevice(deviceConfig) {
    const {
      id,
      host,
      community = 'public',
      version = snmp.Version2c,
      port = 161,
      timeout = 5000,
      retries = 1,
      pollInterval = 60000, // 1 minute default
      vendor = 'generic'
    } = deviceConfig;

    if (this.devices.has(id)) {
      throw new Error(`Device ${id} already exists`);
    }

    const device = {
      id,
      host,
      community,
      version,
      port,
      timeout,
      retries,
      pollInterval,
      vendor,
      lastPoll: null,
      status: 'unknown',
      interfaces: new Map()
    };

    this.devices.set(id, device);
    
    // Create SNMP session
    const options = {
      port,
      retries,
      timeout,
      version
    };

    const session = snmp.createSession(host, community, options);
    this.sessions.set(id, session);

    logger.info(`Added SNMP device: ${id} (${host})`);
    
    // Start polling for this device
    this.startPolling(id);
    
    return device;
  }

  /**
   * Remove a device from monitoring
   */
  removeDevice(deviceId) {
    if (!this.devices.has(deviceId)) {
      throw new Error(`Device ${deviceId} not found`);
    }

    // Stop polling
    this.stopPolling(deviceId);

    // Close SNMP session
    const session = this.sessions.get(deviceId);
    if (session) {
      session.close();
      this.sessions.delete(deviceId);
    }

    this.devices.delete(deviceId);
    logger.info(`Removed SNMP device: ${deviceId}`);
  }

  /**
   * Start polling for a specific device
   */
  startPolling(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    // Clear existing interval if any
    this.stopPolling(deviceId);

    const intervalId = setInterval(async () => {
      try {
        await this.pollDevice(deviceId);
      } catch (error) {
        logger.error(`Error polling device ${deviceId}:`, error);
      }
    }, device.pollInterval);

    this.pollingIntervals.set(deviceId, intervalId);
    logger.info(`Started polling for device ${deviceId} every ${device.pollInterval}ms`);
  }

  /**
   * Stop polling for a specific device
   */
  stopPolling(deviceId) {
    const intervalId = this.pollingIntervals.get(deviceId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(deviceId);
      logger.info(`Stopped polling for device ${deviceId}`);
    }
  }

  /**
   * Poll all devices
   */
  async pollAllDevices() {
    const promises = Array.from(this.devices.keys()).map(deviceId => 
      this.pollDevice(deviceId).catch(error => {
        logger.error(`Error polling device ${deviceId}:`, error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Poll a specific device for metrics
   */
  async pollDevice(deviceId) {
    const device = this.devices.get(deviceId);
    const session = this.sessions.get(deviceId);

    if (!device || !session) {
      throw new Error(`Device ${deviceId} not found or session not available`);
    }

    const startTime = Date.now();
    
    try {
      // Poll system information
      await this.pollSystemInfo(deviceId, session);
      
      // Poll interface statistics
      await this.pollInterfaceStats(deviceId, session);
      
      // Poll CPU and Memory
      await this.pollResourceUtilization(deviceId, session, device.vendor);
      
      device.lastPoll = new Date();
      device.status = 'up';
      
      const pollDuration = Date.now() - startTime;
      logger.debug(`Successfully polled device ${deviceId} in ${pollDuration}ms`);
      
    } catch (error) {
      device.status = 'down';
      device.lastError = error.message;
      logger.error(`Failed to poll device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Poll system information
   */
  async pollSystemInfo(deviceId, session) {
    const oids = [
      this.commonOIDs.sysDescr,
      this.commonOIDs.sysUpTime,
      this.commonOIDs.sysName,
      this.commonOIDs.sysLocation
    ];

    return new Promise((resolve, reject) => {
      session.get(oids, (error, varbinds) => {
        if (error) {
          return reject(error);
        }

        const metrics = [];
        const timestamp = new Date();

        varbinds.forEach((varbind, index) => {
          if (snmp.isVarbindError(varbind)) {
            logger.warn(`System info SNMP error for ${deviceId}:`, snmp.varbindError(varbind));
            return;
          }

          let metricName, value;
          
          switch (oids[index]) {
            case this.commonOIDs.sysUpTime:
              metricName = 'system_uptime';
              value = parseInt(varbind.value) / 100; // Convert to seconds
              break;
            case this.commonOIDs.sysDescr:
              metricName = 'system_description';
              value = varbind.value.toString();
              break;
            case this.commonOIDs.sysName:
              metricName = 'system_name';
              value = varbind.value.toString();
              break;
            case this.commonOIDs.sysLocation:
              metricName = 'system_location';
              value = varbind.value.toString();
              break;
          }

          if (metricName) {
            metrics.push({
              deviceId,
              metric: metricName,
              value: typeof value === 'number' ? value : value.length,
              timestamp,
              tags: { type: 'system' }
            });
          }
        });

        // Store metrics
        this.metricsService.storeMetrics(metrics);
        resolve(metrics);
      });
    });
  }

  /**
   * Poll interface statistics
   */
  async pollInterfaceStats(deviceId, session) {
    return new Promise((resolve, reject) => {
      // First get interface count
      session.get([this.commonOIDs.ifNumber], async (error, varbinds) => {
        if (error) {
          return reject(error);
        }

        const ifCount = parseInt(varbinds[0].value);
        const metrics = [];
        const timestamp = new Date();

        // Walk interface table for all interfaces
        const walkPromises = [];

        // Walk interface descriptions
        walkPromises.push(this.walkOID(session, this.commonOIDs.ifDescr));
        walkPromises.push(this.walkOID(session, this.commonOIDs.ifOperStatus));
        walkPromises.push(this.walkOID(session, this.commonOIDs.ifAdminStatus));
        walkPromises.push(this.walkOID(session, this.commonOIDs.ifSpeed));
        walkPromises.push(this.walkOID(session, this.commonOIDs.ifInOctets));
        walkPromises.push(this.walkOID(session, this.commonOIDs.ifOutOctets));
        walkPromises.push(this.walkOID(session, this.commonOIDs.ifInErrors));
        walkPromises.push(this.walkOID(session, this.commonOIDs.ifOutErrors));

        try {
          const results = await Promise.all(walkPromises);
          const [descriptions, operStatus, adminStatus, speeds, inOctets, outOctets, inErrors, outErrors] = results;

          // Process interface data
          descriptions.forEach(desc => {
            const ifIndex = this.extractIfIndex(desc.oid);
            const ifName = desc.value.toString();

            // Create metrics for this interface
            const interfaceMetrics = [
              {
                deviceId,
                metric: 'interface_oper_status',
                value: this.getInterfaceValue(operStatus, ifIndex, 2), // Default to down (2)
                timestamp,
                tags: { type: 'interface', interface: ifName, ifIndex }
              },
              {
                deviceId,
                metric: 'interface_admin_status',
                value: this.getInterfaceValue(adminStatus, ifIndex, 2),
                timestamp,
                tags: { type: 'interface', interface: ifName, ifIndex }
              },
              {
                deviceId,
                metric: 'interface_speed',
                value: this.getInterfaceValue(speeds, ifIndex, 0),
                timestamp,
                tags: { type: 'interface', interface: ifName, ifIndex }
              },
              {
                deviceId,
                metric: 'interface_in_octets',
                value: this.getInterfaceValue(inOctets, ifIndex, 0),
                timestamp,
                tags: { type: 'interface', interface: ifName, ifIndex }
              },
              {
                deviceId,
                metric: 'interface_out_octets',
                value: this.getInterfaceValue(outOctets, ifIndex, 0),
                timestamp,
                tags: { type: 'interface', interface: ifName, ifIndex }
              },
              {
                deviceId,
                metric: 'interface_in_errors',
                value: this.getInterfaceValue(inErrors, ifIndex, 0),
                timestamp,
                tags: { type: 'interface', interface: ifName, ifIndex }
              },
              {
                deviceId,
                metric: 'interface_out_errors',
                value: this.getInterfaceValue(outErrors, ifIndex, 0),
                timestamp,
                tags: { type: 'interface', interface: ifName, ifIndex }
              }
            ];

            metrics.push(...interfaceMetrics);
          });

          // Store metrics
          this.metricsService.storeMetrics(metrics);
          resolve(metrics);
          
        } catch (walkError) {
          reject(walkError);
        }
      });
    });
  }

  /**
   * Poll CPU and Memory utilization
   */
  async pollResourceUtilization(deviceId, session, vendor = 'generic') {
    const metrics = [];
    const timestamp = new Date();

    try {
      if (vendor === 'cisco') {
        // Cisco-specific CPU and memory OIDs
        const ciscoOids = [
          this.commonOIDs.cpmCPUTotal5minRev,
          this.commonOIDs.ciscoMemoryPoolUsed,
          this.commonOIDs.ciscoMemoryPoolFree
        ];

        await new Promise((resolve, reject) => {
          session.get(ciscoOids, (error, varbinds) => {
            if (error) {
              return reject(error);
            }

            varbinds.forEach((varbind, index) => {
              if (snmp.isVarbindError(varbind)) {
                return;
              }

              let metricName, value;
              
              switch (ciscoOids[index]) {
                case this.commonOIDs.cpmCPUTotal5minRev:
                  metricName = 'cpu_utilization';
                  value = parseInt(varbind.value);
                  break;
                case this.commonOIDs.ciscoMemoryPoolUsed:
                  metricName = 'memory_used';
                  value = parseInt(varbind.value);
                  break;
                case this.commonOIDs.ciscoMemoryPoolFree:
                  metricName = 'memory_free';
                  value = parseInt(varbind.value);
                  break;
              }

              if (metricName) {
                metrics.push({
                  deviceId,
                  metric: metricName,
                  value,
                  timestamp,
                  tags: { type: 'resource', vendor: 'cisco' }
                });
              }
            });

            resolve();
          });
        });
      } else {
        // Generic host resources MIB
        const genericOids = [
          this.commonOIDs.hrProcessorLoad,
          this.commonOIDs.hrMemorySize
        ];

        // Walk processor table for CPU utilization
        const cpuData = await this.walkOID(session, this.commonOIDs.hrProcessorLoad);
        
        if (cpuData.length > 0) {
          const avgCpuLoad = cpuData.reduce((sum, item) => sum + parseInt(item.value), 0) / cpuData.length;
          metrics.push({
            deviceId,
            metric: 'cpu_utilization',
            value: avgCpuLoad,
            timestamp,
            tags: { type: 'resource', vendor: 'generic' }
          });
        }
      }

      // Store metrics
      if (metrics.length > 0) {
        this.metricsService.storeMetrics(metrics);
      }
      
    } catch (error) {
      logger.warn(`Could not retrieve resource utilization for device ${deviceId}:`, error.message);
    }

    return metrics;
  }

  /**
   * Walk an SNMP OID tree
   */
  walkOID(session, oid) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      session.walk(oid, (varbinds) => {
        varbinds.forEach(varbind => {
          if (snmp.isVarbindError(varbind)) {
            logger.warn(`SNMP walk error for ${oid}:`, snmp.varbindError(varbind));
          } else {
            results.push({
              oid: varbind.oid,
              value: varbind.value
            });
          }
        });
      }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
  }

  /**
   * Extract interface index from OID
   */
  extractIfIndex(oid) {
    const parts = oid.split('.');
    return parts[parts.length - 1];
  }

  /**
   * Get interface value from results array
   */
  getInterfaceValue(results, ifIndex, defaultValue = 0) {
    const result = results.find(item => this.extractIfIndex(item.oid) === ifIndex);
    return result ? parseInt(result.value) : defaultValue;
  }

  /**
   * Get device status
   */
  getDeviceStatus(deviceId) {
    const device = this.devices.get(deviceId);
    return device ? {
      id: device.id,
      host: device.host,
      status: device.status,
      lastPoll: device.lastPoll,
      lastError: device.lastError
    } : null;
  }

  /**
   * Get all devices status
   */
  getAllDevicesStatus() {
    return Array.from(this.devices.values()).map(device => ({
      id: device.id,
      host: device.host,
      status: device.status,
      lastPoll: device.lastPoll,
      lastError: device.lastError
    }));
  }

  /**
   * Close all SNMP sessions
   */
  close() {
    logger.info('Closing SNMP Service...');
    
    // Stop all polling
    this.pollingIntervals.forEach((intervalId, deviceId) => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();

    // Close all sessions
    this.sessions.forEach((session, deviceId) => {
      session.close();
    });
    this.sessions.clear();

    logger.info('SNMP Service closed');
  }
}

module.exports = SNMPService;