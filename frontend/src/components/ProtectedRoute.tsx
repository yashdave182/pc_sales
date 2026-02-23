import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export default function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default', // Use theme background instead of gradient
        }}
      >
        <CircularProgress size={40} color="primary" />
      </Box>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check for required permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    // If they lack permission, redirect to dashboard by default.
    // Ensure we don't loop if they are trying to access dashboard itself.
    if (requiredPermission === 'view_dashboard') {
      // If they can't even view dashboard, logout or show error page?
      // Let's redirect to login for now as a safe fallback
      return <Navigate to="/login" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
