import React, { useState, useEffect } from 'react';
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
  Alert,
  CircularProgress,
  Link,
  Divider
} from '@mui/material';
import { 
  Home as HomeIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Launch as LaunchIcon,
  GitHub as GitHubIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Api as ApiIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface DeploymentStatus {
  application: string;
  deployment: {
    status: string;
    platform: string;
    timestamp: string;
  };
  services: {
    backend: {
      status: string;
      uptime: number;
      database: string;
      influxdb: string;
    };
    environment: {
      node_env: string;
      version: string;
    };
  };
  links: {
    health: string;
    api: string;
    documentation: string;
    frontend: string;
  };
  nextSteps: string[];
}

const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentFrontendUrl = window.location.origin;
  const backendUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'Backend URL not configured';

  useEffect(() => {
    const fetchDeploymentStatus = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || '';
        const response = await fetch(`${apiUrl}/deployment-status`);
        if (!response.ok) throw new Error('Failed to fetch deployment status');
        const data = await response.json();
        setDeploymentStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deployment status');
      } finally {
        setLoading(false);
      }
    };

    fetchDeploymentStatus();
  }, []);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getChipColor = (status: string): 'success' | 'info' | 'warning' | 'error' | 'default' => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'deployed':
      case 'connected':
        return 'success';
      case 'configured':
        return 'info';
      case 'disconnected':
      case 'not configured':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getIconColor = (status: string): 'success' | 'info' | 'warning' | 'error' | 'inherit' => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'deployed':
      case 'connected':
        return 'success';
      case 'configured':
        return 'info';
      case 'disconnected':
      case 'not configured':
        return 'warning';
      default:
        return 'inherit';
    }
  };

  const deploymentLinks = [
    {
      title: 'Frontend Application',
      url: currentFrontendUrl,
      description: 'Current frontend deployment (this application)',
      icon: <DashboardIcon />
    },
    {
      title: 'Backend API',
      url: backendUrl,
      description: 'Backend API service endpoint',
      icon: <ApiIcon />
    },
    {
      title: 'API Health Check',
      url: `${backendUrl}/health`,
      description: 'Backend service health status',
      icon: <CheckCircleIcon />
    },
    {
      title: 'API Documentation',
      url: `${backendUrl}/api`,
      description: 'Interactive API documentation',
      icon: <InfoIcon />
    },
    {
      title: 'GitHub Repository',
      url: 'https://github.com/TejaswiBhavani/cloudnet-monitor',
      description: 'Source code and documentation',
      icon: <GitHubIcon />
    }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom display="flex" alignItems="center" gap={2}>
        <InfoIcon /> About CloudNet Monitor
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1" fontWeight="medium">
          Live Deployment Status & Information
        </Typography>
        <Typography variant="body2" mt={1}>
          This page shows the current deployment status and provides access to live services and documentation.
        </Typography>
      </Alert>

      <Grid container spacing={3} mb={4}>
        {/* Deployment Status Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <CloudIcon /> Deployment Information
              </Typography>
              
              {loading ? (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Alert severity="error">
                  <Typography variant="body2">{error}</Typography>
                </Alert>
              ) : deploymentStatus ? (
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Application Status" 
                      secondary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip 
                            label={deploymentStatus.deployment.status} 
                            size="small" 
                            color={getChipColor(deploymentStatus.deployment.status)}
                          />
                          <Typography variant="caption" color="text.secondary">
                            on {deploymentStatus.deployment.platform}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <StorageIcon color={getIconColor(deploymentStatus.services.backend.database)} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Database" 
                      secondary={
                        <Chip 
                          label={deploymentStatus.services.backend.database} 
                          size="small" 
                          color={getChipColor(deploymentStatus.services.backend.database)}
                        />
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <ApiIcon color="success" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Backend Uptime" 
                      secondary={formatUptime(deploymentStatus.services.backend.uptime)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <InfoIcon color={getIconColor(deploymentStatus.services.backend.influxdb)} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="InfluxDB Cloud" 
                      secondary={
                        <Chip 
                          label={deploymentStatus.services.backend.influxdb} 
                          size="small" 
                          color={getChipColor(deploymentStatus.services.backend.influxdb)}
                        />
                      }
                    />
                  </ListItem>
                </List>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        {/* Live Services Links Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <LaunchIcon /> Live Services & Links
              </Typography>
              
              <List dense>
                {deploymentLinks.map((link, index) => (
                  <ListItem key={index} sx={{ pl: 0 }}>
                    <ListItemIcon>
                      {link.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Link 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          underline="hover"
                          color="primary"
                          display="flex"
                          alignItems="center"
                          gap={0.5}
                        >
                          {link.title}
                          <LaunchIcon fontSize="small" />
                        </Link>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {link.description}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                            {link.url}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Next Steps Card */}
      {deploymentStatus && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Next Steps & Recommendations
            </Typography>
            <List dense>
              {deploymentStatus.nextSteps.map((step, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Typography variant="body2" color="primary" fontWeight="bold">
                      {index + 1}.
                    </Typography>
                  </ListItemIcon>
                  <ListItemText primary={step} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Application Information */}
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Application Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Application Name
              </Typography>
              <Typography variant="body1" gutterBottom>
                CloudNet Monitor
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Version
              </Typography>
              <Typography variant="body1" gutterBottom>
                {deploymentStatus?.services.environment.version || '1.0.0'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Environment
              </Typography>
              <Typography variant="body1" gutterBottom>
                {deploymentStatus?.services.environment.node_env || 'production'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Deployment Time
              </Typography>
              <Typography variant="body1" gutterBottom>
                {deploymentStatus?.deployment.timestamp ? 
                  new Date(deploymentStatus.deployment.timestamp).toLocaleString() : 
                  'Not available'
                }
              </Typography>
            </Grid>
          </Grid>
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
          startIcon={<GitHubIcon />}
          onClick={() => window.open('https://github.com/TejaswiBhavani/cloudnet-monitor', '_blank')}
        >
          View on GitHub
        </Button>
      </Box>
    </Box>
  );
};

export default AboutPage;