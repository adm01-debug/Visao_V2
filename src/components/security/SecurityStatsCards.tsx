import { Card, CardContent } from '@/components/ui/card';
import { FileText, AlertTriangle, UserCheck, UserX, ShieldCheck, ShieldOff } from 'lucide-react';
import type { SecurityStats } from './SecurityTypes';

interface SecurityStatsCardsProps {
  stats: SecurityStats;
}

const statItems = [
  {
    key: 'totalLogs' as const,
    label: 'Total Logs',
    icon: FileText,
    color: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    key: 'errorCount' as const,
    label: 'Erros',
    icon: AlertTriangle,
    color: 'bg-destructive/10',
    iconColor: 'text-destructive',
  },
  {
    key: 'accessGranted' as const,
    label: 'Acessos Liberados',
    icon: UserCheck,
    color: 'bg-success/10',
    iconColor: 'text-success',
  },
  {
    key: 'accessDenied' as const,
    label: 'Acessos Negados',
    icon: UserX,
    color: 'bg-destructive/10',
    iconColor: 'text-destructive',
  },
  {
    key: 'whitelistCount' as const,
    label: 'Whitelist',
    icon: ShieldCheck,
    color: 'bg-success/10',
    iconColor: 'text-success',
  },
  {
    key: 'blacklistCount' as const,
    label: 'Blacklist',
    icon: ShieldOff,
    color: 'bg-destructive/10',
    iconColor: 'text-destructive',
  },
];

export function SecurityStatsCards({ stats }: SecurityStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
      {statItems.map(({ key, label, icon: Icon, color, iconColor }) => (
        <Card key={key}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats[key]}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
