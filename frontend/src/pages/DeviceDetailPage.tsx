import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const DeviceDetailPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Device Details
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This page will show detailed device information, metrics, interface status, 
        and configuration options for individual devices.
      </Typography>
      <Button
        variant="contained"
        startIcon={<HomeIcon />}
        onClick={() => navigate('/dashboard')}
      >
        Back to Dashboard
      </Button>
    </Box>
  );
};

export default DeviceDetailPage;