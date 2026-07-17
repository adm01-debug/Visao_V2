import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { HardDrive } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OffenderRow {
  scope: string;
  query_text: string;
  calls: number;
  temp_blks_read: number;
  temp_blks_written: number;
  temp_bytes_total: number;
  avg_temp_bytes_per_call: number;
  total_time_ms: number;
}

interface SummaryRow {
  datname: string;
  temp_files: number;
  temp_bytes: number;
  stats_reset: string | null;
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

function severity(totalBytes: number): 'ok' | 'warn' | 'critical' {
  if (totalBytes < 100 * 1024 * 1024) return 'ok';
  if (totalBytes < 1024 * 1024 * 1024) return 'warn';
  return 'critical';
}

export function TempFileOffendersCard({ limit = 15 }: { limit?: number }) {
  const offenders = useQuery({
    queryKey: ['temp-file-offenders', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_temp_file_offenders', { _limit: limit });
      if (error) throw error;
      return (data ?? []) as OffenderRow[];
    },
    refetchInterval: 60_000,
    retry: false,
  });

  const summary = useQuery({
    queryKey: ['temp-files-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_temp_files_summary');
      if (error) throw error;
      return ((data ?? []) as SummaryRow[])[0] ?? null;
    },
    refetchInterval: 60_000,
    retry: false,
  });

  const errMsg = (offenders.error as Error | undefined)?.message ?? '';
  const isPermission = /access denied|permission|401|403/i.test(errMsg);

  const rows = offenders.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <HardDrive className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Queries que derramam para disco (temp files)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.data && (
          <div className="grid grid-cols-2 gap-4 rounded-md border border-border bg-muted/30 p-3 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Arquivos temporários</p>
              <p className="font-medium tabular-nums">
                {summary.data.temp_files.toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Volume total</p>
              <p className="font-medium tabular-nums">{formatBytes(summary.data.temp_bytes)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Desde</p>
              <p className="text-xs">
                {summary.data.stats_reset
                  ? new Date(summary.data.stats_reset).toLocaleString('pt-BR')
                  : '—'}
              </p>
            </div>
          </div>
        )}

        {offenders.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isPermission ? (
          <p className="text-sm text-muted-foreground">
            Você precisa ser administrador para visualizar esta métrica.
          </p>
        ) : offenders.isError ? (
          <p className="text-sm text-destructive">
            Falha ao carregar: {errMsg || 'erro desconhecido'}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma query derramando para disco. Excelente — <code>work_mem</code> está adequado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Query</th>
                  <th className="py-2 pr-4 text-right">Chamadas</th>
                  <th className="py-2 pr-4 text-right">Temp total</th>
                  <th className="py-2 pr-4 text-right">Média/exec</th>
                  <th className="py-2 pr-2">Sev</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const sev = severity(r.temp_bytes_total);
                  const variant =
                    sev === 'critical' ? 'destructive' : sev === 'warn' ? 'secondary' : 'default';
                  return (
                    <tr key={i} className="border-b border-border/50 align-top">
                      <td className="py-2 pr-4 font-mono text-xs max-w-[48ch]">
                        <code className="whitespace-pre-wrap break-words">{r.query_text}</code>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {r.calls.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatBytes(r.temp_bytes_total)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatBytes(Number(r.avg_temp_bytes_per_call))}
                      </td>
                      <td className="py-2 pr-2">
                        <Badge variant={variant}>{sev}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Auto-refresh 60 s. Queries com derramamento alto podem se beneficiar do aumento de{' '}
          <code>work_mem</code> ou de índices que evitem sort/hash em disco.
        </p>
      </CardContent>
    </Card>
  );
}
