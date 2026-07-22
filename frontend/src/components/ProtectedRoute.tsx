import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/index';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, accessToken, role, isLoading } = useAuth();
  const normalizedRole = role === 'superadmin' ? 'superadmin' : role;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user || !accessToken || !role) {
    return <Navigate to="/" replace />;
  }

  // Check if user has required role
  if (requiredRole) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const normalizedRequired = requiredRoles.map(r => r === 'superadmin' ? 'superadmin' : r);
    if (!normalizedRequired.includes(normalizedRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
