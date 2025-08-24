import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  alpha,
} from '@mui/material';
import { usePermissions } from '../../context/AuthContext';

interface NavigationItemProps {
  item: {
    id: string;
    label: string;
    icon: React.ReactNode;
    path: string;
    roles?: string[];
  };
}

const NavigationItem: React.FC<NavigationItemProps> = ({ item }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasAnyRole } = usePermissions();

  // Check if user has required role
  if (item.roles && !hasAnyRole(item.roles)) {
    return null;
  }

  const isActive = location.pathname === item.path || 
    (item.path !== '/' && location.pathname.startsWith(item.path));

  const handleClick = () => {
    navigate(item.path);
  };

  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <ListItemButton
        onClick={handleClick}
        sx={{
          borderRadius: 2,
          mx: 1,
          backgroundColor: isActive ? alpha('#1976d2', 0.1) : 'transparent',
          '&:hover': {
            backgroundColor: alpha('#1976d2', 0.05),
          },
          '&.Mui-selected': {
            backgroundColor: alpha('#1976d2', 0.1),
          },
        }}
        selected={isActive}
      >
        <ListItemIcon
          sx={{
            color: isActive ? 'primary.main' : 'text.secondary',
            minWidth: 40,
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'primary.main' : 'text.primary',
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

export default NavigationItem;