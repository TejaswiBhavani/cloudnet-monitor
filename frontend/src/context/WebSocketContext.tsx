import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';
import { WebSocketMessage } from '../types';

interface WebSocketState {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  connectionId: string | null;
  subscriptions: Set<string>;
}

interface WebSocketContextValue extends WebSocketState {
  connect: () => void;
  disconnect: () => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  sendMessage: (message: any) => void;
  requestMetrics: (deviceId?: string) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001/ws';
const RECONNECT_INTERVAL = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { isAuthenticated, tokens } = useAuth();
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    lastMessage: null,
    connectionId: null,
    subscriptions: new Set(),
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);

  const connect = () => {
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (!isAuthenticated) {
      console.log('Not authenticated, skipping WebSocket connection');
      return;
    }

    isConnectingRef.current = true;
    console.log('Connecting to WebSocket...');

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;

        setState(prev => ({
          ...prev,
          isConnected: true,
        }));

        // Authenticate if we have a token
        if (tokens?.token) {
          ws.send(JSON.stringify({
            type: 'auth',
            token: tokens.token,
            userId: 'user', // This should come from auth context
          }));
        }

        toast.success('Real-time connection established');
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          setState(prev => ({
            ...prev,
            lastMessage: message,
          }));

          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        isConnectingRef.current = false;

        setState(prev => ({
          ...prev,
          isConnected: false,
          connectionId: null,
        }));

        wsRef.current = null;

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          scheduleReconnect();
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          toast.error('Failed to establish real-time connection after multiple attempts');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
        toast.error('Real-time connection error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      isConnectingRef.current = false;
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current++;
    const delay = RECONNECT_INTERVAL * Math.pow(2, reconnectAttemptsRef.current - 1); // Exponential backoff

    console.log(`Scheduling reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isAuthenticated) {
        connect();
      }
    }, delay);
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      connectionId: null,
      subscriptions: new Set(),
    }));
  };

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  };

  const subscribe = (channels: string[]) => {
    sendMessage({
      type: 'subscribe',
      channels,
    });

    setState(prev => ({
      ...prev,
      subscriptions: new Set([...Array.from(prev.subscriptions), ...channels]),
    }));
  };

  const unsubscribe = (channels: string[]) => {
    sendMessage({
      type: 'unsubscribe',
      channels,
    });

    setState(prev => {
      const newSubscriptions = new Set(prev.subscriptions);
      channels.forEach(channel => newSubscriptions.delete(channel));
      return {
        ...prev,
        subscriptions: newSubscriptions,
      };
    });
  };

  const requestMetrics = (deviceId?: string) => {
    sendMessage({
      type: 'request_metrics',
      deviceId,
    });
  };

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'connection':
        setState(prev => ({
          ...prev,
          connectionId: message.clientId || null,
        }));
        break;

      case 'auth_success':
        console.log('WebSocket authentication successful');
        // Subscribe to default channels
        subscribe(['devices', 'alerts', 'system']);
        break;

      case 'auth_error':
        console.error('WebSocket authentication failed:', message.message);
        toast.error('Real-time authentication failed');
        break;

      case 'metrics_update':
        // Handle real-time metrics updates
        console.log('Received metrics update:', message.data);
        break;

      case 'alerts_update':
        // Handle real-time alerts updates
        console.log('Received alerts update:', message.data);
        if (message.data && Array.isArray(message.data) && message.data.length > 0) {
          message.data.forEach((alert: any) => {
            if (alert.severity === 'critical') {
              toast.error(`Critical Alert: ${alert.message}`, {
                autoClose: false,
              });
            } else if (alert.severity === 'warning') {
              toast.warning(`Warning: ${alert.message}`);
            }
          });
        }
        break;

      case 'system_status':
        // Handle system status updates
        console.log('Received system status:', message.data);
        break;

      case 'metrics_data':
        // Handle metrics data response
        console.log('Received metrics data:', message.data);
        break;

      case 'error':
        console.error('WebSocket error:', message.message);
        toast.error(message.message || 'WebSocket error');
        break;

      default:
        console.log('Unhandled WebSocket message:', message);
    }
  };

  // Effect to manage connection based on authentication state
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // Ping to keep connection alive
  useEffect(() => {
    if (state.isConnected) {
      const pingInterval = setInterval(() => {
        sendMessage({ type: 'ping' });
      }, 30000); // Send ping every 30 seconds

      return () => clearInterval(pingInterval);
    }
  }, [state.isConnected]);

  const value: WebSocketContextValue = {
    ...state,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendMessage,
    requestMetrics,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Hook for subscribing to specific channels
export const useWebSocketSubscription = (channels: string[]) => {
  const { subscribe, unsubscribe, lastMessage, isConnected } = useWebSocket();

  useEffect(() => {
    if (isConnected && channels.length > 0) {
      subscribe(channels);

      return () => {
        unsubscribe(channels);
      };
    }
  }, [isConnected, channels.join(',')]);

  return { lastMessage, isConnected };
};

// Hook for real-time metrics
export const useRealtimeMetrics = (deviceId?: string) => {
  const { requestMetrics, lastMessage, isConnected } = useWebSocket();
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    if (isConnected) {
      // Request initial metrics
      requestMetrics(deviceId);

      // Set up interval for periodic updates
      const interval = setInterval(() => {
        requestMetrics(deviceId);
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isConnected, deviceId]);

  useEffect(() => {
    if (lastMessage?.type === 'metrics_data') {
      setMetrics(lastMessage.data);
    } else if (lastMessage?.type === 'metrics_update') {
      setMetrics(lastMessage.data);
    }
  }, [lastMessage]);

  return { metrics, isConnected };
};