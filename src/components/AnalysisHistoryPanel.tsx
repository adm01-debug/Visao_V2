/**
 * VISÃO - AnalysisHistoryPanel (Refactored)
 * Filters extracted to ./analysis-history/AnalysisHistoryFilters.tsx
 */
import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, AlertTriangle, Camera, Clock, Eye, Shield, HardHat, BarChart3, Brain, FileText, FileSpreadsheet } from 'lucide-react';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { useRealtimeAnalysisHistory, type TimelineItem } from '@/hooks/useRealtimeAnalysisHistory';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnalysisHistoryFilters, type TypeFilter, type SeverityFilter } from './analysis-history/AnalysisHistoryFilters';

const SEVERITY_STYLES: Record<string, string> = {
  low: 'bg-muted text-muted-foreground', medium: 'bg-warning/15 text-warning',
  high: 'bg-warning/20 text-warning', critical: 'bg-destructive/15 text-destructive',
};
const ANALYSIS_ICONS: Record<string, typeof Shield> = { security: Shield, safety: HardHat, productivity: BarChart3, behavior: Brain };

const historyExportHeaders = [
  { key: 'timestamp' as const, label: 'Data/Hora' }, { key: 'type' as const, label: 'Tipo' },
  { key: 'title' as const, label: 'Título' }, { key: 'description' as const, label: 'Descrição' },
  { key: 'severity' as const, label: 'Severidade' }, { key: 'cameraName' as const, label: 'Câmera' },
  { key: 'confidence' as const, label: 'Confiança' },
];

function TimelineEntry({ item }: { item: TimelineItem }) {
  const isAlert = item.type === 'alert';
  const Icon = isAlert ? AlertTriangle : ANALYSIS_ICONS[item.analysisType ?? ''] ?? Eye;
  const timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: ptBR });

  return (
    <div className={cn('relative flex gap-3 rounded-lg border p-3 transition-colors', item.isNew && 'animate-in slide-in-from-top-2 border-primary/40 bg-primary/5', !item.isNew && 'border-border bg-card')}>
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', isAlert ? 'bg-destructive/10' : 'bg-primary/10')}>
        <Icon className={cn('h-4 w-4', isAlert ? 'text-destructive' : 'text-primary')} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight truncate">{item.title}</p>
          {item.isNew && <Badge variant="default" className="shrink-0 text-[10px] px-1.5 py-0">novo</Badge>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" />{timeAgo}</span>
          {item.cameraName && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Camera className="h-3 w-3" />{item.cameraName}</span>}
          {item.severity && <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', SEVERITY_STYLES[item.severity])}>{item.severity}</Badge>}
          {item.confidence != null && <span className="text-[11px] text-muted-foreground">{Math.round(item.confidence * 100)}%</span>}
        </div>
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-lg border p-3"><Skeleton className="h-9 w-9 rounded-full shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-3 w-1/3" /></div></div>
      ))}
    </div>
  );
}

export const AnalysisHistoryPanel = React.forwardRef<HTMLDivElement>(function AnalysisHistoryPanel(_props, _ref) {
  const [open, setOpen] = useState(false);
  const { items, isLoading, clearNewFlags } = useRealtimeAnalysisHistory();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const hasActiveFilters = typeFilter !== 'all' || severityFilter !== 'all';

  const filteredItems = useMemo(() => {
    let result = items;
    if (typeFilter !== 'all') result = result.filter(i => i.type === typeFilter);
    if (severityFilter !== 'all') result = result.filter(i => i.severity === severityFilter);
    return result;
  }, [items, typeFilter, severityFilter]);

  const newCount = items.filter(i => i.isNew).length;
  const alertCount = items.filter(i => i.type === 'alert').length;
  const analysisCount = items.filter(i => i.type === 'analysis').length;
  const clearFilters = () => { setTypeFilter('all'); setSeverityFilter('all'); };

  const handleExport = (format: 'csv' | 'pdf') => {
    const data = filteredItems.map(i => ({ ...i, type: i.type === 'alert' ? 'Alerta' : 'Análise', confidence: i.confidence != null ? `${Math.round(i.confidence * 100)}%` : '-' }));
    const filename = `historico_analises_${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') exportToCSV(data, filename, historyExportHeaders); else exportToPDF(data, filename, 'Histórico de Análises', historyExportHeaders);
  };

  const handleOpen = (isOpen: boolean) => { setOpen(isOpen); if (isOpen) setTimeout(clearNewFlags, 2000); };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Histórico de análises">
          <Activity className="h-5 w-5" />
          {newCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{newCount > 9 ? '9+' : newCount}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base"><Activity className="h-5 w-5 text-primary" />Histórico de Análises</SheetTitle>
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" />{analysisCount} análise{analysisCount !== 1 ? 's' : ''}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" />{alertCount} alerta{alertCount !== 1 ? 's' : ''}</span>
              <span className="text-xs text-muted-foreground">Últimas 24h</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExport('csv')} disabled={filteredItems.length === 0} title="Exportar CSV"><FileSpreadsheet className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExport('pdf')} disabled={filteredItems.length === 0} title="Exportar PDF"><FileText className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </SheetHeader>

        <AnalysisHistoryFilters typeFilter={typeFilter} severityFilter={severityFilter} onTypeChange={setTypeFilter} onSeverityChange={setSeverityFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} />

        <ScrollArea className="flex-1 px-4 py-3">
          {isLoading ? <TimelineSkeleton /> : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Activity className="h-10 w-10 mb-3 opacity-40" /><p className="text-sm font-medium">{hasActiveFilters ? 'Nenhum resultado' : 'Nenhuma atividade'}</p>
              <p className="text-xs mt-1">{hasActiveFilters ? 'Tente ajustar os filtros.' : 'As análises aparecerão aqui em tempo real.'}</p>
              {hasActiveFilters && <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>Limpar filtros</Button>}
            </div>
          ) : (
            <div className="space-y-2">
              {hasActiveFilters && <p className="text-xs text-muted-foreground mb-2">{filteredItems.length} de {items.length} itens</p>}
              {filteredItems.map(item => <TimelineEntry key={item.id} item={item} />)}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
});

export default AnalysisHistoryPanel;
