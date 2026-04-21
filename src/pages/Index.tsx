/**
 * Standalone page — renders OUTSIDE MainLayout (no BottomNavigation).
 * Listed in scripts/check-mobile-nav.mjs ALLOWLIST.
 * Reason: apenas redireciona (`/dashboard` se autenticado, `/auth` caso
 * contrário); renderiza `<SplashScreen />` em transição, sem conteúdo
 * persistente nem BottomNav.
 * See docs/LAYOUTS.md §11 — Camada 0.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SplashScreen } from '@/components/LoadingSpinner';
import { PageMeta } from '@/components/PageMeta';
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
