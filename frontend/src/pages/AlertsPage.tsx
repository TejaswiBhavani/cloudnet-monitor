import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Tab,
  Tabs,
  Badge,
  Tooltip
} from '@mui/material';
import { 
  Home as HomeIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  AccessTime as AccessTimeIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface AlertItem {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
  device?: string;
}

const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  // Mock alert data
  const mockAlerts: AlertItem[] = [
    {
      id: '1',
      severity: 'critical',
      title: 'High CPU Usage Detected',
      description: 'Router-01 CPU usage has exceeded 85% for the last 10 minutes',
      timestamp: '2 minutes ago',
      acknowledged: false,
      device: 'Router-01'
    },
    {
      id: '2', 
      severity: 'warning',
      title: 'Network Interface Down',
      description: 'Switch-03 interface eth0/1 is down',
      timestamp: '15 minutes ago',
      acknowledged: false,
      device: 'Switch-03'
    },
    {
      id: '3',
      severity: 'info',
      title: 'Device Configuration Backup Completed',
      description: 'Scheduled backup for Firewall-01 completed successfully',
      timestamp: '1 hour ago',
      acknowledged: true,
      device: 'Firewall-01'
    },
    {
      id: '4',
      severity: 'warning',
      title: 'High Memory Usage',
      description: 'Server-02 memory usage is at 78%',
      timestamp: '2 hours ago',
      acknowledged: true,
      device: 'Server-02'
    }
  ];

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      case 'success':
        return <CheckCircleIcon color="success" />;
      default:
        return <InfoIcon />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      default:
        return 'default';
    }
  };

  const activeAlerts = mockAlerts.filter(alert => !alert.acknowledged);
  const acknowledgedAlerts = mockAlerts.filter(alert => alert.acknowledged);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const renderAlertList = (alerts: AlertItem[]) => (
    <List>
      {alerts.length === 0 ? (
        <ListItem>
          <ListItemText 
            primary="No alerts found"
            secondary="All systems are operating normally"
          />
        </ListItem>
      ) : (
        alerts.map((alert) => (
          <ListItem key={alert.id} divider>
            <ListItemIcon>
              {getAlertIcon(alert.severity)}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {alert.title}
                  </Typography>
                  <Chip 
                    label={alert.severity} 
                    size="small" 
                    color={getAlertColor(alert.severity) as any}
                    variant="outlined"
                  />
                  {alert.device && (
                    <Chip 
                      label={alert.device} 
                      size="small" 
                      variant="outlined"
                    />
                  )}
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="body2" color="text.secondary" mb={0.5}>
                    {alert.description}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <AccessTimeIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {alert.timestamp}
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <Tooltip title={alert.acknowledged ? "Acknowledged" : "Acknowledge alert"}>
                <IconButton
                  edge="end"
                  color={alert.acknowledged ? "success" : "default"}
                >
                  {alert.acknowledged ? <CheckCircleIcon /> : <NotificationsIcon />}
                </IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))
      )}
    </List>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom display="flex" alignItems="center" gap={2}>
            <NotificationsIcon /> Alerts & Notifications
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and manage system alerts, notifications, and acknowledgments
          </Typography>
        </Box>
        
        <Box display="flex" gap={2}>
          <Tooltip title="Configure alert settings">
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => navigate('/settings')}
            >
              Configure
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Alert Summary */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <ErrorIcon color="error" />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="error">
                    {mockAlerts.filter(a => a.severity === 'critical' && !a.acknowledged).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Critical Alerts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <WarningIcon color="warning" />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {mockAlerts.filter(a => a.severity === 'warning' && !a.acknowledged).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Warning Alerts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircleIcon color="success" />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {acknowledgedAlerts.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Acknowledged
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <InfoIcon color="info" />
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {mockAlerts.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Alerts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {activeAlerts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You have {activeAlerts.length} active alert(s) that require attention.
        </Alert>
      )}

      {/* Alert Tabs */}
      <Card elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab 
              label={
                <Badge badgeContent={activeAlerts.length} color="error">
                  Active Alerts
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={acknowledgedAlerts.length} color="success">
                  Acknowledged
                </Badge>
              } 
            />
          </Tabs>
        </Box>
        
        <Box>
          {tabValue === 0 && renderAlertList(activeAlerts)}
          {tabValue === 1 && renderAlertList(acknowledgedAlerts)}
        </Box>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Box>
    </Box>
  );
};

export default AlertsPage;