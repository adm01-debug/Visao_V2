import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole, type AppRole } from '@/hooks/useUserRole';
import { PageSkeletons } from '@/components/PageSkeletons';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  /** Role mínima necessária para acessar a rota */
  minRole?: AppRole;
  /** Rota de fallback quando a role é insuficiente */
  accessDeniedRoute?: string;
}

export const ProtectedRoute = ({
  children,
  requireAuth = true,
  redirectTo = '/auth',
  minRole,
  accessDeniedRoute = '/acesso-negado',
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasMinRole, loading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || (requireAuth && user && minRole && roleLoading)) {
    return <PageSkeletons.Dashboard />;
  }

  if (requireAuth && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (!requireAuth && user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (minRole && !hasMinRole(minRole)) {
    return <Navigate to={accessDeniedRoute} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
