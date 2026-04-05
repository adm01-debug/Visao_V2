import { memo } from 'react';
import { Camera, Users, AlertTriangle, Shield, Zap } from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';

interface DashboardStatsProps {
  onlineCameras: number;
  totalCameras: number;
  totalPeople: number;
  activeAlerts: number;
  streamingCameras: number;
}

export function DashboardStats({
  onlineCameras,
  totalCameras,
  totalPeople,
  activeAlerts,
  streamingCameras,
}: DashboardStatsProps) {
  return (
    <div className="stats-grid stagger-in">
      <StatsCard
        title="Câmeras Online"
        value={onlineCameras}
        subtitle={`de ${totalCameras} total`}
        icon={Camera}
        variant="primary"
        trend={{ value: totalCameras > 0 ? Math.round((onlineCameras / totalCameras) * 100) : 0, isPositive: true }}
      />
      <StatsCard
        title="Pessoas Detectadas"
        value={totalPeople}
        icon={Users}
        variant="success"
        trend={{ value: 12, isPositive: true }}
      />
      <StatsCard
        title="Alertas Ativos"
        value={activeAlerts}
        icon={AlertTriangle}
        variant={activeAlerts > 5 ? 'danger' : 'warning'}
        trend={{ value: 5, isPositive: false }}
      />
      <StatsCard
        title="Segurança"
        value="98%"
        icon={Shield}
        variant="success"
        trend={{ value: 2, isPositive: true }}
      />
      <StatsCard
        title="Streams Ativos"
        value={streamingCameras}
        subtitle={`de ${totalCameras} total`}
        icon={Zap}
        variant="primary"
        trend={{ value: streamingCameras, isPositive: true }}
      />
    </div>
  );
}

export default memo(DashboardStats);
