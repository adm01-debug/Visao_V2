/**
 * VISÃO - History Item
 */
import { Users, Shield, HardHat, BarChart3, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AnalysisHistoryEntry } from '@/types/continuousAnalysis';

const TYPE_ICONS: Record<string, React.ElementType> = {
  security: Shield,
  safety: HardHat,
  productivity: BarChart3,
};

export function HistoryItem({ entry }: { entry: AnalysisHistoryEntry }) {
  const Icon = TYPE_ICONS[entry.analysisType] || Eye;

  return (
    <div className={cn('flex items-center gap-3 p-2 rounded-lg transition-colors', entry.success ? 'hover:bg-card/50' : 'bg-destructive/10')}>
      <div className={cn('p-2 rounded-lg', entry.success ? 'bg-primary/10' : 'bg-destructive/20')}>
        <Icon className={cn('w-4 h-4', entry.success ? 'text-primary' : 'text-destructive')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm capitalize">{entry.analysisType}</span>
          {entry.alertsGenerated > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              {entry.alertsGenerated} alerta{entry.alertsGenerated > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{entry.result.people_count || 0} pessoas</span>
          <span>•</span>
          <span>{entry.duration}ms</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: ptBR })}
      </span>
    </div>
  );
}
