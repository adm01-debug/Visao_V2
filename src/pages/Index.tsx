import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SplashScreen } from '@/components/LoadingSpinner';
import { PageMeta } from '@/components/PageMeta';

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

  return <><PageMeta title="Início" description="Sistema de vigilância inteligente com IA" /><SplashScreen /></>;
};

export default Index;
