import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Search, RefreshCw, AlertTriangle } from 'lucide-react';

interface Hotspot {
  schema_name: string;
  table_name: string;
  seq_scan: number;
  seq_tup_read: number;
  idx_scan: number;
  seq_ratio_pct: number | null;
  avg_rows_per_seq_scan: number;
  table_size_pretty: string;
  n_live_tup: number;
  severity: 'critical' | 'warning' | 'info' | 'ok';
  recommendation: string;
}

const severityVariant: Record<Hotspot['severity'], 'destructive' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  warning: 'secondary',
  info: 'outline',
  ok: 'outline',
};

const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n);

export function SeqScanHotspotsCard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-seq-scan-hotspots'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_seq_scan_hotspots', {
        _min_size_mb: 5,
        _min_seq_scans: 100,
      });
      if (error) throw error;
      return (data ?? []) as Hotspot[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const criticalCount = data?.filter((d) => d.severity === 'critical').length ?? 0;
  const warningCount = data?.filter((d) => d.severity === 'warning').length ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-4 w-4" aria-hidden />
              Hotspots de Sequential Scan
            </CardTitle>
            <CardDescription>
              Tabelas grandes lidas full-scan — candidatas a novos índices.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Atualizar hotspots"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {data && data.length > 0 && (
          <div className="flex gap-2 pt-2">
            {criticalCount > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {criticalCount} crítico(s)
              </Badge>
            )}
            {warningCount > 0 && <Badge variant="secondary">{warningCount} atenção</Badge>}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Analisando padrões de scan…</p>}
        {error && (
          <p className="text-sm text-destructive">
            Falha ao carregar (requer permissão de administrador).
          </p>
        )}
        {data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum hotspot detectado. Índices estão sendo usados eficientemente. ✅
          </p>
        )}
        {data && data.length > 0 && (
          <ScrollArea className="h-[360px] pr-2">
            <ul className="space-y-2">
              {data.map((h) => (
                <li
                  key={`${h.schema_name}.${h.table_name}`}
                  className="rounded-md border border-border p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs truncate">
                      {h.schema_name}.{h.table_name}
                    </span>
                    <Badge variant={severityVariant[h.severity]} className="text-[10px]">
                      {h.severity}
                    </Badge>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Tamanho: {h.table_size_pretty}</span>
                    <span>Linhas: {fmt(h.n_live_tup)}</span>
                    <span>Seq scans: {fmt(h.seq_scan)}</span>
                    <span>Idx scans: {fmt(h.idx_scan)}</span>
                    <span>Ratio seq: {h.seq_ratio_pct ?? '—'}%</span>
                    <span>Média/scan: {fmt(Math.round(h.avg_rows_per_seq_scan))}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-foreground/80">{h.recommendation}</p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
