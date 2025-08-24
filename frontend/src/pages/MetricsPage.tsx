import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const MetricsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Metrics & Analytics
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This page will display comprehensive metrics analysis, time-series charts, 
        performance trends, and capacity planning tools.
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

export default MetricsPage;