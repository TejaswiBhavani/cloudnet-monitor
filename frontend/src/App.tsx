import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

// Layout components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Page components
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DevicesPage from './pages/DevicesPage';
import DeviceDetailPage from './pages/DeviceDetailPage';
import MetricsPage from './pages/MetricsPage';
import AlertsPage from './pages/AlertsPage';
import TopologyPage from './pages/TopologyPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

// Context
import { useAuth } from './context/AuthContext';

const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        {/* You can replace this with a proper loading spinner component */}
        <div>Loading...</div>
      </Box>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />

      {/* Protected routes with layout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                {/* Main dashboard */}
                <Route path="/dashboard" element={<DashboardPage />} />
                
                {/* Device management */}
                <Route path="/devices" element={<DevicesPage />} />
                <Route path="/devices/:deviceId" element={<DeviceDetailPage />} />
                
                {/* Monitoring */}
                <Route path="/metrics" element={<MetricsPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/topology" element={<TopologyPage />} />
                
                {/* Reports */}
                <Route path="/reports" element={<ReportsPage />} />
                
                {/* Settings */}
                <Route path="/settings" element={<SettingsPage />} />
                
                {/* 404 page */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Fallback for unauthenticated users */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
};

export default App;