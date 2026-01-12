import React, { ComponentType } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function withAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  return function WithAuthComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuthStore();
    const location = useLocation();

    if (isLoading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <WrappedComponent {...props} />;
  };
}

export default withAuth;
