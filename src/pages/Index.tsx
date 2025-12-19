import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { mockAlerts } from '@/data/mockData';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const unreadAlertsCount = mockAlerts.filter(a => !a.isRead).length;

  return (
    <>
      <Helmet>
        <title>VisionAI - Sistema de Vigilância Inteligente</title>
        <meta name="description" content="Plataforma de vigilância inteligente com análise de vídeo por IA para monitoramento de segurança e produtividade." />
      </Helmet>
      
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header alertCount={unreadAlertsCount} />
          
          <main className="flex-1 overflow-hidden">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab !== 'dashboard' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-muted-foreground mb-2">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </p>
                  <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default Index;
