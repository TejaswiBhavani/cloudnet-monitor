import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert
} from '@mui/material';
import { 
  Home as HomeIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Build as BuildIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const settingsCategories = [
    {
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions',
      icon: <PeopleIcon />,
      status: 'Coming Soon',
      color: 'primary' as const
    },
    {
      title: 'SNMP Configuration',
      description: 'Configure SNMP settings for device monitoring',
      icon: <NetworkIcon />,
      status: 'Coming Soon',
      color: 'info' as const
    },
    {
      title: 'Security Settings',
      description: 'Authentication, SSL certificates, and security policies',
      icon: <SecurityIcon />,
      status: 'Coming Soon',
      color: 'warning' as const
    },
    {
      title: 'Notification Settings',
      description: 'Email alerts, webhooks, and notification preferences',
      icon: <NotificationsIcon />,
      status: 'Coming Soon',
      color: 'success' as const
    },
    {
      title: 'Database Settings',
      description: 'Database configuration and data retention policies',
      icon: <StorageIcon />,
      status: 'Coming Soon',
      color: 'secondary' as const
    },
    {
      title: 'System Maintenance',
      description: 'Backup, restore, and system maintenance tools',
      icon: <BuildIcon />,
      status: 'Coming Soon',
      color: 'error' as const
    }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom display="flex" alignItems="center" gap={2}>
        <SettingsIcon /> System Settings
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1" fontWeight="medium">
          Settings Configuration in Development
        </Typography>
        <Typography variant="body2" mt={1}>
          This CloudNet Monitor deployment is ready for production use with default configurations. 
          Advanced settings and customization options will be available in future updates.
        </Typography>
      </Alert>

      <Grid container spacing={3} mb={4}>
        {settingsCategories.map((category, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card 
              elevation={2} 
              sx={{ 
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box 
                      sx={{ 
                        p: 1, 
                        borderRadius: 2, 
                        bgcolor: `${category.color}.light`,
                        color: `${category.color}.contrastText`
                      }}
                    >
                      {category.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {category.title}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip 
                    label={category.status} 
                    size="small" 
                    color={category.color}
                    variant="outlined"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {category.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current System Configuration
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Authentication" 
                secondary="JWT-based authentication enabled with secure session management"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <StorageIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Database" 
                secondary="PostgreSQL database configured for metadata and configuration storage"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <NetworkIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Real-time Monitoring" 
                secondary="WebSocket connections enabled for live data updates"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <NotificationsIcon color="info" />
              </ListItemIcon>
              <ListItemText 
                primary="InfluxDB Metrics" 
                secondary="Optional InfluxDB Cloud integration for time-series metrics storage"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
        <Button
          variant="outlined"
          onClick={() => window.open('https://github.com/TejaswiBhavani/cloudnet-monitor', '_blank')}
        >
          View Documentation
        </Button>
      </Box>
    </Box>
  );
};

export default SettingsPage;