// Type definitions for CloudNet Monitor Frontend

export interface Device {
  id: string;
  name: string;
  host: string;
  type: 'router' | 'switch' | 'firewall' | 'server' | 'printer' | 'ups' | 'wireless_controller' | 'access_point';
  vendor?: string;
  model?: string;
  location?: string;
  snmp_community?: string;
  snmp_version?: number;
  snmp_port?: number;
  enabled: boolean;
  status?: 'up' | 'down' | 'unknown';
  lastPoll?: string;
  lastError?: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceInterface {
  id: number;
  device_id: string;
  interface_index: number;
  interface_name: string;
  interface_description?: string;
  interface_type?: string;
  mac_address?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Metric {
  deviceId: string;
  metric: string;
  value: number | string;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface MetricPoint {
  time: string;
  value: number;
  device_id?: string;
  metric_name?: string;
}

export interface AlertRule {
  id: number;
  name: string;
  description?: string;
  metric: string;
  condition: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  device_filter?: Record<string, any>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: number;
  rule_id: number;
  device_id: string;
  metric: string;
  current_value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  message?: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  rule_name?: string;
  device_name?: string;
  device_host?: string;
  device_type?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  enabled: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardOverview {
  devices: {
    total: number;
    byType: Array<{ type: string; count: number; enabled_count: number }>;
    byStatus: Record<string, number>;
    healthScore: number;
  };
  alerts: {
    total: number;
    bySeverity: Array<{ severity: string; count: number }>;
    critical: number;
    warning: number;
  };
  metrics: {
    recentSummary: MetricPoint[];
    dataPointsLastHour: number;
  };
  timestamp: string;
}

export interface TopologyNode {
  id: string;
  name: string;
  type: string;
  vendor?: string;
  location?: string;
  status: 'up' | 'down' | 'unknown';
  interfaces: DeviceInterface[];
}

export interface TopologyLink {
  source: string;
  target: string;
  type: 'wan' | 'lan' | 'access';
  status: 'up' | 'down';
}

export interface NetworkTopology {
  nodes: TopologyNode[];
  links: TopologyLink[];
  statistics: {
    totalNodes: number;
    totalLinks: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

export interface PerformanceData {
  timeRange: string;
  cpu: MetricPoint[];
  memory: MetricPoint[];
  interfaces: MetricPoint[];
  throughput: MetricPoint[];
}

export interface AvailabilityData {
  timeRange: string;
  availability: Array<{
    deviceId: string;
    availability: number;
    totalChecks: number;
    successfulChecks: number;
    maxUptime: number;
  }>;
  trends: MetricPoint[];
  interfaces: MetricPoint[];
}

export interface CapacityData {
  timeRange: string;
  trends: {
    cpu: MetricPoint[];
    memory: MetricPoint[];
    interfaces: MetricPoint[];
  };
  concerns: {
    cpu: MetricPoint[];
    memory: MetricPoint[];
    interfaces: MetricPoint[];
  };
  summary: {
    totalConcerns: number;
    highCpuDevices: number;
    highMemoryDevices: number;
    highUtilizationInterfaces: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface AuthTokens {
  token: string;
  refreshToken?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    username: string;
    role: string;
  };
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  timestamp: string;
  clientId?: string;
}

export interface ConnectionStats {
  totalConnections: number;
  authenticatedConnections: number;
  rooms: string[];
  roomCounts: Record<string, number>;
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
  timestamp?: string;
  [key: string]: any;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  device?: string;
  metric?: string;
}

// Component prop types
export interface DeviceCardProps {
  device: Device;
  onClick?: (device: Device) => void;
  showActions?: boolean;
}

export interface MetricChartProps {
  data: TimeSeriesDataPoint[];
  title: string;
  height?: number;
  showLegend?: boolean;
  color?: string;
}

export interface AlertListProps {
  alerts: Alert[];
  onAcknowledge?: (alertId: number) => void;
  onResolve?: (alertId: number) => void;
}

// Filter and search types
export interface DeviceFilter {
  type?: string;
  vendor?: string;
  location?: string;
  status?: string;
  search?: string;
}

export interface MetricFilter {
  deviceId?: string;
  metric?: string;
  timeRange?: string;
  interval?: string;
}

export interface AlertFilter {
  severity?: string;
  deviceId?: string;
  acknowledged?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Pagination types
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Theme types
export interface ThemeMode {
  mode: 'light' | 'dark';
  primary: string;
  secondary: string;
}

// Navigation types
export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  roles?: string[];
  children?: NavigationItem[];
}

// Form types
export interface DeviceFormData {
  id: string;
  name: string;
  host: string;
  type: string;
  vendor?: string;
  model?: string;
  location?: string;
  snmp_community?: string;
  snmp_version?: number;
  snmp_port?: number;
}

export interface AlertRuleFormData {
  name: string;
  description?: string;
  metric: string;
  condition: string;
  threshold: number;
  severity: string;
  device_filter?: Record<string, any>;
}

// Error types
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}