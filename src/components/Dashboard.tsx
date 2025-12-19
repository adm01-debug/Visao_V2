import { useState } from 'react';
import { 
  Camera, 
  AlertTriangle, 
  Users, 
  Shield,
  TrendingUp,
  Activity
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { CameraCard } from './CameraCard';
import { AlertCard } from './AlertCard';
import { CameraModal } from './CameraModal';
import { mockCameras, mockAlerts, mockAnalytics } from '@/data/mockData';
import { Camera as CameraType } from '@/types/surveillance';

export function Dashboard() {
  const [selectedCamera, setSelectedCamera] = useState<CameraType | null>(null);
  const unreadAlerts = mockAlerts.filter(a => !a.isRead);
  const priorityCameras = mockCameras.filter(c => c.status === 'alert' || c.status === 'warning');
  const normalCameras = mockCameras.filter(c => c.status === 'online' || c.status === 'offline');

  return (
    <>
      <div className="p-6 space-y-6 overflow-auto h-[calc(100vh-4rem)]">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <StatsCard
            title="Câmeras Online"
            value={`${mockAnalytics.onlineCameras}/${mockAnalytics.totalCameras}`}
            subtitle="3 câmeras offline"
            icon={Camera}
            variant="primary"
            trend={{ value: 2, isPositive: true }}
          />
          <StatsCard
            title="Alertas Ativos"
            value={mockAnalytics.activeAlerts}
            subtitle="2 críticos"
            icon={AlertTriangle}
            variant="danger"
          />
          <StatsCard
            title="Pessoas Detectadas"
            value={mockAnalytics.detectedPeople}
            subtitle="Em tempo real"
            icon={Users}
            variant="default"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Score de Segurança"
            value={`${mockAnalytics.securityScore}%`}
            subtitle="Excelente"
            icon={Shield}
            variant="success"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cameras Section */}
          <div className="lg:col-span-2 space-y-4 animate-fade-in-delay-1">
            {/* Priority Cameras */}
            {priorityCameras.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <h2 className="text-lg font-semibold text-foreground">Câmeras com Alertas</h2>
                </div>
                <div className="camera-grid">
                  {priorityCameras.map(camera => (
                    <CameraCard 
                      key={camera.id} 
                      camera={camera} 
                      onClick={() => setSelectedCamera(camera)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Cameras */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Todas as Câmeras</h2>
                </div>
                <button className="text-sm text-primary hover:underline">Ver todas</button>
              </div>
              <div className="camera-grid">
                {normalCameras.slice(0, 6).map(camera => (
                  <CameraCard 
                    key={camera.id} 
                    camera={camera}
                    onClick={() => setSelectedCamera(camera)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Alerts Sidebar */}
          <div className="space-y-4 animate-fade-in-delay-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <h2 className="text-lg font-semibold text-foreground">Alertas Recentes</h2>
              </div>
              <span className="text-sm text-muted-foreground">{unreadAlerts.length} não lidos</span>
            </div>
            
            <div className="space-y-3">
              {mockAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>

            {/* Productivity Score */}
            <div className="glass-card p-5 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Produtividade</h3>
              </div>
              <div className="relative pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-bold text-primary">{mockAnalytics.productivityScore}%</span>
                  <span className="text-xs text-success">+3% vs ontem</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: `${mockAnalytics.productivityScore}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Baseado em análise de movimentação e atividade
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {selectedCamera && (
        <CameraModal
          camera={selectedCamera}
          isOpen={!!selectedCamera}
          onClose={() => setSelectedCamera(null)}
        />
      )}
    </>
  );
}
