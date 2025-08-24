import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const DevicesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Device Management
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This page will show comprehensive device management functionality including device listing, 
        adding/editing devices, SNMP configuration, and real-time status monitoring.
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

export default DevicesPage;