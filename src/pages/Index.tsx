import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { RulesPanel } from '@/components/RulesPanel';
import { FloorPlanMap } from '@/components/FloorPlanMap';
import { AIAnalysisPanel } from '@/components/AIAnalysisPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useAlerts } from '@/hooks/useAlerts';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useAlerts();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
      case 'analytics':
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
      
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header alertCount={unreadCount} />
          
          <main className="flex-1 overflow-hidden">
            {renderContent()}
          </main>
        </div>
      </div>
    </>
  );
};

export default Index;
