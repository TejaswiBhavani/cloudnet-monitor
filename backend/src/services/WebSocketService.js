const WebSocket = require('ws');
const logger = require('../utils/logger');

/**
 * WebSocket Service for real-time dashboard updates
 * Manages WebSocket connections and broadcasts metrics updates
 */
class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      clientTracking: true
    });
    
    this.clients = new Map(); // Store client connections with metadata
    this.rooms = new Map(); // Store room-based subscriptions
    
    this.setupWebSocketServer();
    
    // Metrics broadcasting interval
    this.broadcastInterval = setInterval(() => {
      this.broadcastMetricsUpdate();
    }, 5000); // Broadcast every 5 seconds
    
    logger.info('WebSocket Service initialized');
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        id: clientId,
        ws: ws,
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        connectedAt: new Date(),
        subscriptions: new Set(),
        authenticated: false,
        userId: null
      };

      this.clients.set(clientId, clientInfo);
      
      logger.info(`WebSocket client connected: ${clientId} from ${clientInfo.ip}`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection',
        message: 'Connected to CloudNet Monitor',
        clientId: clientId,
        timestamp: new Date().toISOString()
      });

      // Handle incoming messages
      ws.on('message', (data) => {
        this.handleMessage(clientId, data);
      });

      // Handle client disconnection
      ws.on('close', (code, reason) => {
        this.handleDisconnection(clientId, code, reason);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Send ping to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Handle pong responses
      ws.on('pong', () => {
        clientInfo.lastPong = new Date();
      });
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket Server error:', error);
    });
  }

  generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  handleMessage(clientId, data) {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(clientId);

      if (!client) {
        return;
      }

      logger.debug(`Message from ${clientId}:`, message);

      switch (message.type) {
        case 'auth':
          this.handleAuthentication(clientId, message);
          break;
        
        case 'subscribe':
          this.handleSubscription(clientId, message);
          break;
        
        case 'unsubscribe':
          this.handleUnsubscription(clientId, message);
          break;
        
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        
        case 'request_metrics':
          this.handleMetricsRequest(clientId, message);
          break;
        
        default:
          this.sendToClient(clientId, {
            type: 'error',
            message: 'Unknown message type',
            timestamp: new Date().toISOString()
          });
      }
    } catch (error) {
      logger.error(`Error handling message from ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      });
    }
  }

  handleAuthentication(clientId, message) {
    const client = this.clients.get(clientId);
    
    // TODO: Implement proper JWT validation
    // For now, we'll accept any token that's provided
    if (message.token) {
      client.authenticated = true;
      client.userId = message.userId || 'unknown';
      
      this.sendToClient(clientId, {
        type: 'auth_success',
        message: 'Authentication successful',
        timestamp: new Date().toISOString()
      });
      
      logger.info(`Client ${clientId} authenticated as user ${client.userId}`);
    } else {
      this.sendToClient(clientId, {
        type: 'auth_error',
        message: 'Authentication failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  handleSubscription(clientId, message) {
    const client = this.clients.get(clientId);
    
    if (!client.authenticated) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Authentication required for subscriptions',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { channels } = message;
    
    if (Array.isArray(channels)) {
      channels.forEach(channel => {
        client.subscriptions.add(channel);
        this.addToRoom(channel, clientId);
      });

      this.sendToClient(clientId, {
        type: 'subscription_success',
        channels: channels,
        message: `Subscribed to ${channels.length} channels`,
        timestamp: new Date().toISOString()
      });

      logger.info(`Client ${clientId} subscribed to channels: ${channels.join(', ')}`);
    }
  }

  handleUnsubscription(clientId, message) {
    const client = this.clients.get(clientId);
    const { channels } = message;
    
    if (Array.isArray(channels)) {
      channels.forEach(channel => {
        client.subscriptions.delete(channel);
        this.removeFromRoom(channel, clientId);
      });

      this.sendToClient(clientId, {
        type: 'unsubscription_success',
        channels: channels,
        message: `Unsubscribed from ${channels.length} channels`,
        timestamp: new Date().toISOString()
      });

      logger.info(`Client ${clientId} unsubscribed from channels: ${channels.join(', ')}`);
    }
  }

  handleMetricsRequest(clientId, message) {
    const client = this.clients.get(clientId);
    
    if (!client.authenticated) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // TODO: Fetch actual metrics from MetricsService
    const mockMetrics = this.generateMockMetrics(message.deviceId);
    
    this.sendToClient(clientId, {
      type: 'metrics_data',
      deviceId: message.deviceId,
      metrics: mockMetrics,
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnection(clientId, code, reason) {
    const client = this.clients.get(clientId);
    
    if (client) {
      // Remove from all rooms
      client.subscriptions.forEach(channel => {
        this.removeFromRoom(channel, clientId);
      });
      
      // Remove client
      this.clients.delete(clientId);
      
      logger.info(`WebSocket client disconnected: ${clientId} (code: ${code}, reason: ${reason})`);
    }
  }

  addToRoom(roomName, clientId) {
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    this.rooms.get(roomName).add(clientId);
  }

  removeFromRoom(roomName, clientId) {
    const room = this.rooms.get(roomName);
    if (room) {
      room.delete(clientId);
      if (room.size === 0) {
        this.rooms.delete(roomName);
      }
    }
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(`Error sending message to client ${clientId}:`, error);
      }
    }
  }

  broadcastToRoom(roomName, message) {
    const room = this.rooms.get(roomName);
    
    if (room) {
      room.forEach(clientId => {
        this.sendToClient(clientId, message);
      });
    }
  }

  broadcastToAll(message) {
    this.clients.forEach((client, clientId) => {
      if (client.authenticated) {
        this.sendToClient(clientId, message);
      }
    });
  }

  broadcastMetricsUpdate() {
    // Broadcast to devices channel
    this.broadcastToRoom('devices', {
      type: 'metrics_update',
      data: this.generateMockDevicesMetrics(),
      timestamp: new Date().toISOString()
    });

    // Broadcast to alerts channel
    this.broadcastToRoom('alerts', {
      type: 'alerts_update',
      data: this.generateMockAlerts(),
      timestamp: new Date().toISOString()
    });

    // Broadcast system status
    this.broadcastToRoom('system', {
      type: 'system_status',
      data: {
        totalDevices: 15,
        activeDevices: 14,
        totalAlerts: 3,
        criticalAlerts: 1
      },
      timestamp: new Date().toISOString()
    });
  }

  // TODO: Replace with actual metrics from MetricsService
  generateMockMetrics(deviceId) {
    return {
      deviceId: deviceId || 'router-001',
      metrics: {
        cpu_utilization: Math.random() * 100,
        memory_utilization: Math.random() * 100,
        interface_utilization: Math.random() * 100,
        uptime: Math.floor(Math.random() * 1000000),
        packet_loss: Math.random() * 5
      }
    };
  }

  generateMockDevicesMetrics() {
    const devices = ['router-001', 'switch-001', 'firewall-001', 'server-001'];
    
    return devices.map(deviceId => ({
      deviceId,
      status: Math.random() > 0.1 ? 'up' : 'down',
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      uptime: Math.floor(Math.random() * 1000000),
      lastUpdate: new Date().toISOString()
    }));
  }

  generateMockAlerts() {
    const alerts = [];
    
    if (Math.random() > 0.7) {
      alerts.push({
        id: 'alert-' + Date.now(),
        deviceId: 'router-001',
        metric: 'cpu_utilization',
        severity: 'critical',
        threshold: 90,
        currentValue: 95.5,
        message: 'CPU utilization is above threshold',
        timestamp: new Date().toISOString()
      });
    }

    if (Math.random() > 0.8) {
      alerts.push({
        id: 'alert-' + (Date.now() + 1),
        deviceId: 'switch-001',
        metric: 'interface_errors',
        severity: 'warning',
        threshold: 100,
        currentValue: 150,
        message: 'High error rate on interface GigabitEthernet0/1',
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }

  getConnectionStats() {
    const authenticatedClients = Array.from(this.clients.values()).filter(client => client.authenticated);
    
    return {
      totalConnections: this.clients.size,
      authenticatedConnections: authenticatedClients.length,
      rooms: Array.from(this.rooms.keys()),
      roomCounts: Object.fromEntries(
        Array.from(this.rooms.entries()).map(([room, clients]) => [room, clients.size])
      )
    };
  }

  close() {
    logger.info('Closing WebSocket Service...');
    
    // Clear broadcast interval
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
    }
    
    // Close all client connections
    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close(1001, 'Server shutting down');
      }
    });
    
    // Close WebSocket server
    this.wss.close((error) => {
      if (error) {
        logger.error('Error closing WebSocket server:', error);
      } else {
        logger.info('WebSocket Service closed');
      }
    });
  }
}

module.exports = WebSocketService;