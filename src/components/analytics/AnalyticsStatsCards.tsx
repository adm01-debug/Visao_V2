import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Shield, Camera, Users } from 'lucide-react';

interface AnalyticsStatsProps {
  totalAlerts: number;
  criticalAlerts: number;
  unreadAlerts: number;
  onlineCameras: number;
  totalCameras: number;
  totalPeople: number;
}

export function AnalyticsStatsCards({ totalAlerts, criticalAlerts, unreadAlerts, onlineCameras, totalCameras, totalPeople }: AnalyticsStatsProps) {
  const cards = [
    { label: 'Total de Alertas', value: totalAlerts, sub: `${unreadAlerts} não lidos`, icon: AlertTriangle, colorClass: 'bg-primary/10 text-primary' },
    { label: 'Alertas Críticos', value: criticalAlerts, sub: 'Requerem atenção', icon: Shield, colorClass: 'bg-destructive/10 text-destructive', valueClass: 'text-destructive' },
    { label: 'Câmeras Ativas', value: `${onlineCameras}/${totalCameras}`, sub: 'Monitorando', icon: Camera, colorClass: 'bg-success/10 text-success' },
    { label: 'Pessoas Detectadas', value: totalPeople, sub: 'Em tempo real', icon: Users, colorClass: 'bg-primary/10 text-primary' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      {cards.map(({ label, value, sub, icon: Icon, colorClass, valueClass }) => (
        <Card key={label} className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`text-3xl font-bold ${valueClass || 'text-foreground'}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              </div>
              <div className={`p-3 rounded-xl ${colorClass.split(' ')[0]}`}>
                <Icon className={`w-6 h-6 ${colorClass.split(' ')[1]}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
