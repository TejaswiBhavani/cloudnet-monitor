import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  subMessage?: string;
  size?: number;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  subMessage,
  size = 60,
  fullScreen = false,
}) => {
  const containerProps = fullScreen
    ? {
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        gap: 2,
      }
    : {
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
        gap: 2,
      };

  return (
    <Box sx={containerProps}>
      <CircularProgress size={size} thickness={4} />
      <Typography variant="h6" color="text.secondary" textAlign="center">
        {message}
      </Typography>
      {subMessage && (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {subMessage}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;