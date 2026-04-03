import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoadingSkeleton } from '@/components/ui/LoadingState';

/**
 * Index page - redirects to /dashboard (authenticated) or /auth (unauthenticated)
 */
const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      navigate(user ? '/dashboard' : '/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  return <PageLoadingSkeleton />;
};

export default Index;
