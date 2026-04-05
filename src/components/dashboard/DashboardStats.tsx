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
  const uptimePercent = totalCameras > 0 ? Math.round((onlineCameras / totalCameras) * 100) : 0;

  return (
    <div className="stats-grid stagger-in">
      <StatsCard
        title="Câmeras"
        value={`${onlineCameras}/${totalCameras}`}
        subtitle="online"
        icon={Camera}
        variant="primary"
        trend={{ value: uptimePercent, isPositive: uptimePercent >= 80 }}
      />
      <StatsCard
        title="Alertas"
        value={activeAlerts}
        subtitle={activeAlerts === 0 ? 'tudo limpo' : `${activeAlerts > 10 ? 'atenção' : 'ativos'}`}
        icon={AlertTriangle}
        variant={activeAlerts > 10 ? 'danger' : activeAlerts > 0 ? 'warning' : 'success'}
        trend={{ value: 5, isPositive: false }}
      />
      <StatsCard
        title="Pessoas"
        value={totalPeople}
        subtitle="detectadas"
        icon={Users}
        variant="primary"
        trend={{ value: 12, isPositive: true }}
      />
      <StatsCard
        title="Segurança"
        value={`${uptimePercent}%`}
        subtitle="score dinâmico"
        icon={Shield}
        variant={uptimePercent >= 90 ? 'success' : uptimePercent >= 70 ? 'warning' : 'danger'}
      />
      <StatsCard
        title="IA"
        value={streamingCameras > 0 ? 'Ativa' : 'Inativa'}
        subtitle={streamingCameras > 0 ? `${streamingCameras} streams` : 'sem streams'}
        icon={Zap}
        variant={streamingCameras > 0 ? 'primary' : 'default'}
      />
    </div>
  );
}

export default memo(DashboardStats);
