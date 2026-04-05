/**
 * VISÃO - ALPRDashboard (Refactored)
 * Sub-components: ALPRStatsCards, ALPRCharts, ALPRVehicleHistory
 */
import { useMemo } from 'react';
import { usePlateDetections } from '@/hooks/usePlateDetections';
import { Car, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { ALPRStatsCards } from './alpr/ALPRStatsCards';
import { ALPRCharts } from './alpr/ALPRCharts';
import { ALPRVehicleHistory } from './alpr/ALPRVehicleHistory';
import { ALPR_STATUS_COLORS } from '@/constants/chartColors';

interface ALPRDashboardProps {
  className?: string;
}

export function ALPRDashboard({ className }: ALPRDashboardProps) {
  const { detections, stats, loading } = usePlateDetections();
  const [periodFilter, setPeriodFilter] = useState('7d');

  const chartData = useMemo(() => {
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const hour = (new Date().getHours() - 23 + i + 24) % 24;
      const count = detections.filter(d => {
        const detectionHour = d.timestamp.getHours();
        return detectionHour === hour && isToday(d.timestamp);
      }).length;
      return { hour: `${hour}h`, detecções: count };
    });

    const dailyData = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const count = detections.filter(d =>
        format(d.timestamp, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length;
      return { dia: format(date, 'EEE', { locale: ptBR }), detecções: count, date: format(date, 'dd/MM') };
    });

    const statusData = [
      { name: 'Autorizados', value: detections.filter(d => d.status === 'authorized').length, color: ALPR_STATUS_COLORS.authorized },
      { name: 'Desconhecidos', value: detections.filter(d => d.status === 'unknown').length, color: ALPR_STATUS_COLORS.unknown },
      { name: 'Não Autorizados', value: detections.filter(d => d.status === 'unauthorized').length, color: ALPR_STATUS_COLORS.unauthorized },
      { name: 'Blacklist', value: detections.filter(d => d.status === 'blacklist').length, color: ALPR_STATUS_COLORS.blacklist },
    ].filter(s => s.value > 0);

    const cameraData = Object.entries(
      detections.reduce((acc, d) => { acc[d.camera_name] = (acc[d.camera_name] || 0) + 1; return acc; }, {} as Record<string, number>)
    ).map(([camera, count]) => ({ camera, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    return { hourlyData, dailyData, statusData, cameraData };
  }, [detections]);

  const vehicleHistory = useMemo(() => {
    const grouped = detections.reduce((acc, d) => {
      const ts = typeof d.timestamp === 'string' ? d.timestamp : (d.timestamp as Date).toISOString();
      if (!acc[d.plate]) {
        acc[d.plate] = { plate: d.plate, firstSeen: ts, lastSeen: ts, totalVisits: 0, status: d.status, camera: d.camera_name, vehicleType: d.vehicle_type };
      }
      const entry = acc[d.plate]!;
      entry.totalVisits++;
      if (ts > entry.lastSeen) entry.lastSeen = ts;
      if (ts < entry.firstSeen) entry.firstSeen = ts;
      return acc;
    }, {} as Record<string, { plate: string; firstSeen: string; lastSeen: string; totalVisits: number; status: string; camera: string; vehicleType: string | null }>);

    return Object.values(grouped).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  }, [detections]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Car className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Dashboard ALPR</h1>
            <p className="text-sm text-muted-foreground">Métricas e histórico de veículos</p>
          </div>
        </div>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Últimas 24h</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ALPRStatsCards stats={stats} />
      <ALPRCharts {...chartData} />
      <ALPRVehicleHistory vehicleHistory={vehicleHistory} />
    </div>
  );
}
