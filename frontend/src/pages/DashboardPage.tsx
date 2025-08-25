import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Devices as DevicesIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

import { useWebSocket } from '../context/WebSocketContext';
import { DashboardOverview } from '../types';
import { LoadingSpinner } from '../components/Common';

// Mock data for demonstration
const mockMetricsData = [
  { time: '10:00', cpu: 45, memory: 62, network: 78 },
  { time: '10:05', cpu: 52, memory: 65, network: 82 },
  { time: '10:10', cpu: 48, memory: 68, network: 75 },
  { time: '10:15', cpu: 55, memory: 71, network: 88 },
  { time: '10:20', cpu: 61, memory: 69, network: 91 },
  { time: '10:25', cpu: 58, memory: 73, network: 86 },
];

const deviceTypeData = [
  { name: 'Routers', value: 5, color: '#1976d2' },
  { name: 'Switches', value: 8, color: '#42a5f5' },
  { name: 'Servers', value: 12, color: '#90caf9' },
  { name: 'Firewalls', value: 3, color: '#bbdefb' },
];

const alertsData = [
  { severity: 'Critical', count: 2 },
  { severity: 'Warning', count: 5 },
  { severity: 'Info', count: 12 },
];

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  trendValue,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color="success" fontSize="small" />;
      case 'down':
        return <TrendingDownIcon color="error" fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Card elevation={2} sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: `${color}.light`,
              color: `${color}.contrastText`,
            }}
          >
            {icon}
          </Box>
          {trend && (
            <Box display="flex" alignItems="center" gap={0.5}>
              {getTrendIcon()}
              <Typography variant="caption" color="text.secondary">
                {trendValue}
              </Typography>
            </Box>
          )}
        </Box>

        <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
          {value}
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>

        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const { isConnected } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setLastUpdate(new Date());
    setTimeout(() => setLoading(false), 1000);
  };

  if (loading) {
    return (
      <LoadingSpinner
        message="Loading Dashboard Data..."
        subMessage="Fetching network metrics and device status"
      />
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Network Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Real-time monitoring and analytics for your network infrastructure
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            icon={isConnected ? <CheckCircleIcon /> : <ErrorIcon />}
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'error'}
            variant="outlined"
          />
          <Tooltip title="Refresh dashboard data">
            <IconButton 
              onClick={handleRefresh} 
              color="primary"
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Connection Alert */}
      {!isConnected && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Tooltip title="Try to reconnect">
              <IconButton
                color="inherit"
                size="small"
                onClick={handleRefresh}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          }
        >
          Real-time connection is unavailable. Data may not be current. Click refresh to try reconnecting.
        </Alert>
      )}

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Devices"
            value={28}
            subtitle="2 offline"
            icon={<DevicesIcon />}
            color="primary"
            trend="up"
            trendValue="+2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Active Alerts"
            value={7}
            subtitle="2 critical"
            icon={<WarningIcon />}
            color="warning"
            trend="down"
            trendValue="-3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Network Health"
            value="98.5%"
            subtitle="Availability"
            icon={<CheckCircleIcon />}
            color="success"
            trend="stable"
            trendValue="0.1%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Response"
            value="24ms"
            subtitle="Latency"
            icon={<SpeedIcon />}
            color="info"
            trend="up"
            trendValue="+2ms"
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} mb={4}>
        {/* Network Performance Chart */}
        <Grid item xs={12} lg={8}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  Network Performance
                </Typography>
                <Box display="flex" gap={2}>
                  <Chip size="small" label="CPU" sx={{ bgcolor: '#1976d2', color: 'white' }} />
                  <Chip size="small" label="Memory" sx={{ bgcolor: '#42a5f5', color: 'white' }} />
                  <Chip size="small" label="Network" sx={{ bgcolor: '#90caf9', color: 'white' }} />
                </Box>
              </Box>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockMetricsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line 
                    type="monotone" 
                    dataKey="cpu" 
                    stroke="#1976d2" 
                    strokeWidth={2}
                    name="CPU (%)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="memory" 
                    stroke="#42a5f5" 
                    strokeWidth={2}
                    name="Memory (%)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="network" 
                    stroke="#90caf9" 
                    strokeWidth={2}
                    name="Network (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Device Distribution */}
        <Grid item xs={12} lg={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={3}>
                Device Distribution
              </Typography>
              
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deviceTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>

              <Box mt={2}>
                {deviceTypeData.map((item, index) => (
                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: item.color,
                        }}
                      />
                      <Typography variant="body2">{item.name}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts and Activity */}
      <Grid container spacing={3}>
        {/* Recent Alerts */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={3}>
                Alert Summary
              </Typography>
              
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={alertsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="severity" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>

              <Box mt={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </Typography>
                  <Typography variant="body2" color="primary">
                    View All →
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={3}>
                System Status
              </Typography>
              
              <Box sx={{ '& > *': { mb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" py={1}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <SecurityIcon color="success" />
                    <Typography variant="body2">Security Monitoring</Typography>
                  </Box>
                  <Chip label="Operational" color="success" size="small" />
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center" py={1}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <TimelineIcon color="success" />
                    <Typography variant="body2">Data Collection</Typography>
                  </Box>
                  <Chip label="Active" color="success" size="small" />
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center" py={1}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <DevicesIcon color="warning" />
                    <Typography variant="body2">Device Polling</Typography>
                  </Box>
                  <Chip label="Degraded" color="warning" size="small" />
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center" py={1}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <SpeedIcon color="success" />
                    <Typography variant="body2">Performance Analysis</Typography>
                  </Box>
                  <Chip label="Operational" color="success" size="small" />
                </Box>
              </Box>

              <Paper elevation={0} sx={{ bgcolor: 'grey.50', p: 2, mt: 2, borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Uptime:</strong> 99.2% (7 days)
                  <br />
                  <strong>Data Points:</strong> 2.3M collected today
                  <br />
                  <strong>Storage:</strong> 78% capacity used
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;