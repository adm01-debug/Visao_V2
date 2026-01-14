import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

// Layout Components from barrel export
import { MainLayout, SkipLink } from '@/components';

// Feature Components
import { Dashboard } from '@/components/Dashboard';
import { RulesPanel } from '@/components/RulesPanel';
import { FloorPlanMap } from '@/components/FloorPlanMap';
import { AIAnalysisPanel } from '@/components/AIAnalysisPanel';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { BlacklistAlertBanner } from '@/components/BlacklistAlertBanner';

// Hooks and Context
import { useAuth } from '@/contexts/AuthContext';

// UI Components
import { PageLoadingSkeleton } from '@/components/ui/LoadingState';
import { PageTransition } from '@/components/ui/MotionComponents';

const Index = () => {
  const [activeTab] = useState('dashboard');
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <PageLoadingSkeleton />;
  }

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'rules':
        return <RulesPanel />;
      case 'cameras':
        return <FloorPlanMap />;
      case 'reports':
        return <AnalyticsDashboard />;
      case 'ai-vision':
        return (
          <div className="p-6 overflow-auto h-full">
            <div className="max-w-xl mx-auto">
              <AIAnalysisPanel />
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-2xl font-semibold text-muted-foreground mb-2">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </p>
              <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <Helmet>
        <title>VisionAI - Sistema de Vigilância Inteligente</title>
        <meta name="description" content="Plataforma de vigilância inteligente com análise de vídeo por IA para monitoramento de segurança e produtividade." />
      </Helmet>
      
      <SkipLink targetId="main-content" />
      
      <MainLayout>
        <PageTransition>
          <div id="main-content" role="main" aria-label="Conteúdo principal" className="h-full">
            {renderContent()}
          </div>
        </PageTransition>
        <BlacklistAlertBanner />
      </MainLayout>
    </>
  );
};

export default Index;
